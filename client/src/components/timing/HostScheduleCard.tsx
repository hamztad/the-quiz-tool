import { useState } from 'react';
import { CLIENT_EVENTS } from '@quiz-tool/shared';
import type { PublicRoomState, QuizRunMode } from '@quiz-tool/shared';
import { Button } from '../ui/Button';
import { useSocket } from '../../hooks/useSocket';

const DELAY_PRESETS = [
  { label: 'Umiddelbart', ms: 0 },
  { label: '1 min', ms: 60_000 },
  { label: '5 min', ms: 5 * 60_000 },
  { label: '10 min', ms: 10 * 60_000 },
] as const;

const DURATION_PRESETS = [
  { label: '30 min', ms: 30 * 60_000 },
  { label: '1 time', ms: 60 * 60_000 },
  { label: '2 timer', ms: 2 * 60 * 60_000 },
  { label: 'Ingen slutt', ms: 0 },
] as const;

interface HostScheduleCardProps {
  room: PublicRoomState;
  disabled?: boolean;
}

export function HostScheduleCard({ room, disabled = false }: HostScheduleCardProps) {
  const { socket } = useSocket();
  const [open, setOpen] = useState(Boolean(room.schedule?.enabled));
  const [startDelayMs, setStartDelayMs] = useState(room.schedule?.startDelayMs ?? 5 * 60_000);
  const [durationMs, setDurationMs] = useState(room.schedule?.durationMs ?? 60 * 60_000);
  const [runMode, setRunMode] = useState<QuizRunMode>(room.schedule?.runMode ?? 'assisted');
  const [autoOpenFirst, setAutoOpenFirst] = useState(
    room.schedule?.autoOpenFirstQuestion ?? true,
  );

  const canSchedule = room.phase === 'lobby' && room.questions.length > 0;
  const scheduled = Boolean(room.schedule?.enabled && room.schedule.startsAt);

  const emitSchedule = () => {
    socket.emit(CLIENT_EVENTS.QUIZ_SCHEDULE_SET, {
      startDelayMs,
      durationMs: durationMs > 0 ? durationMs : undefined,
      runMode,
      autoOpenFirstQuestion: autoOpenFirst,
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

      {scheduled && (
        <p className="mt-2 text-sm font-medium text-violet-800">
          Planlagt start er aktiv — deltakerne ser nedtelling.
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-4">
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
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted mb-2">
              Varighet
            </p>
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
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted mb-2">
              Modus
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
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-900'
                      : 'border-indigo-200/70 bg-white text-quiz-muted'
                  }`}
                >
                  {mode === 'manual' ? 'Manuell' : 'Assistert'}
                </button>
              ))}
            </div>
          </div>

          {runMode === 'assisted' && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoOpenFirst}
                onChange={(e) => setAutoOpenFirst(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-indigo-300 text-violet-600"
              />
              <span className="text-sm text-quiz-text">
                Åpne første spørsmål automatisk når quizen starter
              </span>
            </label>
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
