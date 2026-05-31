import { useMemo, useState } from 'react';
import {
  CLIENT_EVENTS,
  MAX_SCHEDULE_DELAY_MS,
  MAX_SCHEDULE_DURATION_MS,
  formatScheduleClock,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@quiz-tool/shared';
import {
  deliveryModeLabel,
  normalizeDeliveryMode,
  type PublicRoomState,
  type QuizDeliveryMode,
  type QuizRunMode,
} from '@quiz-tool/shared';
import { Button } from '../ui/Button';
import { useSocket } from '../../hooks/useSocket';

const DELAY_PRESETS = [
  { label: 'Umiddelbart', ms: 0 },
  { label: '1 min', ms: 60_000 },
  { label: '5 min', ms: 5 * 60_000 },
  { label: '10 min', ms: 10 * 60_000 },
  { label: '1 time', ms: 60 * 60_000 },
  { label: '1 dag', ms: 24 * 60 * 60_000 },
] as const;

const DURATION_PRESETS = [
  { label: '30 min', ms: 30 * 60_000 },
  { label: '1 time', ms: 60 * 60_000 },
  { label: '2 timer', ms: 2 * 60 * 60_000 },
  { label: '24 timer', ms: MAX_SCHEDULE_DURATION_MS },
  { label: 'Ingen slutt', ms: 0 },
] as const;

type TimingMode = 'relative' | 'clock';
type EndMode = 'duration' | 'clock';

interface HostScheduleCardProps {
  room: PublicRoomState;
  disabled?: boolean;
}

function defaultStartLocal(): string {
  const d = new Date(Date.now() + 5 * 60_000);
  d.setSeconds(0, 0);
  return toDatetimeLocalValue(d.getTime());
}

function defaultEndLocal(startLocal: string, durationMs: number): string {
  const startMs = fromDatetimeLocalValue(startLocal);
  return toDatetimeLocalValue(startMs + durationMs);
}

function defaultDurationMs(
  deliveryMode: QuizDeliveryMode,
  fromSchedule?: number,
): number {
  if (fromSchedule != null && fromSchedule > 0) return fromSchedule;
  if (deliveryMode === 'self_paced' || deliveryMode === 'interval') {
    return MAX_SCHEDULE_DURATION_MS;
  }
  return 60 * 60_000;
}

export function HostScheduleCard({ room, disabled = false }: HostScheduleCardProps) {
  const { socket } = useSocket();
  const initialDelivery = normalizeDeliveryMode(room.schedule?.deliveryMode);
  const [open, setOpen] = useState(Boolean(room.schedule?.enabled));
  const [timingMode, setTimingMode] = useState<TimingMode>('relative');
  const [startDelayMs, setStartDelayMs] = useState(room.schedule?.startDelayMs ?? 5 * 60_000);
  const [durationMs, setDurationMs] = useState(() =>
    defaultDurationMs(initialDelivery, room.schedule?.durationMs),
  );
  const [startLocal, setStartLocal] = useState(defaultStartLocal);
  const [endMode, setEndMode] = useState<EndMode>('duration');
  const [endLocal, setEndLocal] = useState(() =>
    defaultEndLocal(defaultStartLocal(), defaultDurationMs(initialDelivery, room.schedule?.durationMs)),
  );
  const [deliveryMode, setDeliveryMode] = useState<QuizDeliveryMode>(() =>
    normalizeDeliveryMode(room.schedule?.deliveryMode),
  );
  const [runMode, setRunMode] = useState<QuizRunMode>(room.schedule?.runMode ?? 'assisted');
  const [autoOpenFirst, setAutoOpenFirst] = useState(
    room.schedule?.autoOpenFirstQuestion ?? true,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const canSchedule = room.phase === 'lobby' && room.questions.length > 0;
  const scheduled = Boolean(room.schedule?.enabled && room.schedule.startsAt);

  const bounds = useMemo(() => {
    const now = Date.now();
    return {
      minStart: toDatetimeLocalValue(now),
      maxStart: toDatetimeLocalValue(now + MAX_SCHEDULE_DELAY_MS),
    };
  }, [open]);

  const emitSchedule = () => {
    setFormError(null);
    if (
      (deliveryMode === 'self_paced' || deliveryMode === 'interval') &&
      durationMs <= 0 &&
      endMode !== 'clock'
    ) {
      setFormError(
        deliveryMode === 'interval'
          ? 'Intervall-quiz må ha en sluttid (velg varighet eller slutt klokkeslett).'
          : 'Selvgående quiz må ha en sluttid (velg varighet eller slutt klokkeslett).',
      );
      return;
    }
    const base = {
      deliveryMode,
      runMode:
        deliveryMode === 'self_paced' || deliveryMode === 'interval' ? 'manual' : runMode,
      autoOpenFirstQuestion:
        deliveryMode === 'self_paced' || deliveryMode === 'interval' ? false : autoOpenFirst,
    };

    if (timingMode === 'relative') {
      socket.emit(CLIENT_EVENTS.QUIZ_SCHEDULE_SET, {
        ...base,
        startDelayMs,
        durationMs: durationMs > 0 ? durationMs : undefined,
      });
      return;
    }

    const startsAt = fromDatetimeLocalValue(startLocal);
    if (Number.isNaN(startsAt)) {
      setFormError('Velg et gyldig starttidspunkt.');
      return;
    }

    if (endMode === 'clock') {
      const endsAt = fromDatetimeLocalValue(endLocal);
      if (Number.isNaN(endsAt)) {
        setFormError('Velg et gyldig sluttidspunkt.');
        return;
      }
      socket.emit(CLIENT_EVENTS.QUIZ_SCHEDULE_SET, {
        ...base,
        startsAt,
        endsAt,
      });
      return;
    }

    socket.emit(CLIENT_EVENTS.QUIZ_SCHEDULE_SET, {
      ...base,
      startsAt,
      durationMs: durationMs > 0 ? durationMs : undefined,
    });
  };

  const cancelSchedule = () => {
    socket.emit(CLIENT_EVENTS.QUIZ_SCHEDULE_CANCEL);
  };

  if (!canSchedule && !scheduled) return null;

  return (
    <div className="rounded-2xl border-2 border-violet-200/60 bg-white/80 p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="quiz-display text-lg font-bold text-quiz-text">⏰ Planlegg tid</span>
        <span className="text-quiz-muted text-sm">{open ? '▾' : '▸'}</span>
      </button>

      {scheduled && room.schedule?.startsAt && (
        <p className="mt-2 text-sm font-medium text-violet-800">
          Planlagt start {formatScheduleClock(room.schedule.startsAt)}
          {room.schedule.endsAt
            ? ` · slutt ${formatScheduleClock(room.schedule.endsAt)}`
            : ' · ingen automatisk slutt'}
          {' · '}
          {deliveryModeLabel(room.schedule.deliveryMode)}
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted mb-2">
              Når skal Gruizen starte?
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'relative' as const, label: 'Om litt' },
                  { id: 'clock' as const, label: 'Klokkeslett' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setTimingMode(m.id)}
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                    timingMode === m.id
                      ? 'border-violet-500 bg-violet-100 text-violet-900'
                      : 'border-indigo-200/70 bg-white text-quiz-muted hover:border-violet-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {timingMode === 'relative' ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted mb-2">
                Start om
              </p>
              <div className="flex flex-wrap gap-2">
                {DELAY_PRESETS.map((p) => (
                  <button
                    key={p.ms}
                    type="button"
                    disabled={disabled}
                    onClick={() => setStartDelayMs(p.ms)}
                    className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                      startDelayMs === p.ms
                        ? 'border-violet-500 bg-violet-100 text-violet-900'
                        : 'border-indigo-200/70 bg-white text-quiz-muted hover:border-violet-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-quiz-muted">Maks 3 døgn frem.</p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-quiz-muted mb-2">
                Start kl.
              </label>
              <input
                type="datetime-local"
                disabled={disabled}
                value={startLocal}
                min={bounds.minStart}
                max={bounds.maxStart}
                onChange={(e) => {
                  setStartLocal(e.target.value);
                  if (endMode === 'clock') {
                    const startMs = fromDatetimeLocalValue(e.target.value);
                    const endMs = fromDatetimeLocalValue(endLocal);
                    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
                      setEndLocal(defaultEndLocal(e.target.value, durationMs));
                    }
                  }
                }}
                className="w-full rounded-xl border-2 border-indigo-200/70 px-3 py-2.5 text-sm font-medium text-quiz-text"
              />
              <p className="mt-2 text-xs text-quiz-muted">
                Lokal tid på enheten din. Maks 3 døgn frem.
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted mb-2">
              Varighet
            </p>
            {timingMode === 'clock' && (
              <div className="flex flex-wrap gap-2 mb-3">
                {(
                  [
                    { id: 'duration' as const, label: 'Varighet' },
                    { id: 'clock' as const, label: 'Slutt kl.' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setEndMode(m.id)}
                    className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
                      endMode === m.id
                        ? 'border-amber-500 bg-amber-100 text-amber-900'
                        : 'border-indigo-200/70 bg-white text-quiz-muted'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {timingMode === 'clock' && endMode === 'clock' ? (
              <div>
                <input
                  type="datetime-local"
                  disabled={disabled}
                  value={endLocal}
                  min={startLocal}
                  max={toDatetimeLocalValue(
                    fromDatetimeLocalValue(startLocal) + MAX_SCHEDULE_DURATION_MS,
                  )}
                  onChange={(e) => setEndLocal(e.target.value)}
                  className="w-full rounded-xl border-2 border-indigo-200/70 px-3 py-2.5 text-sm font-medium text-quiz-text"
                />
                <p className="mt-2 text-xs text-quiz-muted">Maks 24 timer etter start.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      disabled={disabled}
                      onClick={() => setDurationMs(p.ms)}
                      className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                        durationMs === p.ms
                          ? 'border-amber-500 bg-amber-100 text-amber-900'
                          : 'border-indigo-200/70 bg-white text-quiz-muted hover:border-amber-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-quiz-muted">Maks 24 timer varighet.</p>
              </>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted mb-2">
              Gjennomføring
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  {
                    id: 'qm_led' as const,
                    label: 'QM-styrt',
                    hint: 'Gruizmaster åpner og lukker oppgaver manuelt',
                  },
                  {
                    id: 'self_paced' as const,
                    label: 'Selvgående',
                    hint: 'Alle oppgaver med én gang — låses ved innsending',
                  },
                  {
                    id: 'interval' as const,
                    label: 'Intervall',
                    hint: 'Oppgaver åpnes etter tidsplan — følg med',
                  },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setDeliveryMode(mode.id);
                    if (mode.id === 'self_paced' || mode.id === 'interval') {
                      setDurationMs((prev) =>
                        prev > 0 ? prev : MAX_SCHEDULE_DURATION_MS,
                      );
                    }
                  }}
                  className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold text-left max-w-full ${
                    deliveryMode === mode.id
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-900'
                      : 'border-indigo-200/70 bg-white text-quiz-muted'
                  }`}
                >
                  <span className="block">{mode.label}</span>
                  <span className="block text-xs font-normal mt-0.5 opacity-90">{mode.hint}</span>
                </button>
              ))}
            </div>
            {deliveryMode === 'self_paced' && (
              <p className="mt-2 text-xs text-cyan-900/90 rounded-lg bg-cyan-50 border border-cyan-200/60 px-3 py-2">
                Krever sluttid. Spill er åpne til frist; andre oppgaver låses for hver deltaker ved
                innsending. Deltakere ser midlertidig leaderboard underveis.
              </p>
            )}
            {deliveryMode === 'interval' && (
              <p className="mt-2 text-xs text-indigo-900/90 rounded-lg bg-indigo-50 border border-indigo-200/60 px-3 py-2">
                Krever sluttid. Hver oppgave får et tidsvindu; deltakere ser ÅPEN / STENGT og
                nedtelling. Varsler kan slås på ved oppgaveåpning.
              </p>
            )}
          </div>

          {deliveryMode === 'qm_led' && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted mb-2">
                Gruizmaster-flyt
              </p>
              <div className="flex flex-wrap gap-2">
                {(['manual', 'assisted'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={disabled}
                    onClick={() => setRunMode(mode)}
                    className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
                      runMode === mode
                        ? 'border-violet-500 bg-violet-50 text-violet-900'
                        : 'border-indigo-200/70 bg-white text-quiz-muted'
                    }`}
                  >
                    {mode === 'manual' ? 'Manuell åpning' : 'Assistert (auto første)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {deliveryMode === 'qm_led' && runMode === 'assisted' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoOpenFirst}
                onChange={(e) => setAutoOpenFirst(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-indigo-300 text-violet-600"
              />
              <span className="text-sm text-quiz-text">
                Åpne første spørsmål automatisk når Gruizen starter
              </span>
            </label>
          )}

          {formError && (
            <p className="text-sm text-red-600 rounded-xl bg-red-50 px-3 py-2" role="alert">
              {formError}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="cta"
              className="flex-1"
              disabled={disabled || !canSchedule}
              onClick={emitSchedule}
            >
              Aktiver tidsplan
            </Button>
            {scheduled && (
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={disabled}
                onClick={cancelSchedule}
              >
                Avbryt plan
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
