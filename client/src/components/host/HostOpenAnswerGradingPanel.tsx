import { CLIENT_EVENTS, canStartAiGrading, collectOpenAnswerGradeJobs, getOpenQuestionIds } from '@quiz-tool/shared';
import type { PublicRoomState } from '@quiz-tool/shared';
import { useSocket } from '../../hooks/useSocket';
import { Button } from '../ui/Button';

interface HostOpenAnswerGradingPanelProps {
  room: PublicRoomState;
}

export function HostOpenAnswerGradingPanel({ room }: HostOpenAnswerGradingPanelProps) {
  const { socket } = useSocket();
  const mode = room.settings.openAnswerGradingMode ?? 'peer';
  const openCount = getOpenQuestionIds(room.questions).length;
  const jobs = collectOpenAnswerGradeJobs(room.questions, room.answers);
  const aiCheck = canStartAiGrading(openCount, jobs.length, room.aiGrading);
  const aiRunning = room.aiGrading?.status === 'running';
  const aiDone = room.aiGrading?.status === 'done';
  const aiError = room.aiGrading?.status === 'error';
  const progress =
    room.aiGrading && room.aiGrading.total > 0
      ? Math.round((room.aiGrading.completed / room.aiGrading.total) * 100)
      : 0;

  const setMode = (next: 'peer' | 'ai') => {
    if (next === mode || aiRunning) return;
    socket.emit(CLIENT_EVENTS.OPEN_ANSWER_GRADING_MODE_SET, { mode: next });
  };

  const startAi = () => {
    socket.emit(CLIENT_EVENTS.AI_GRADING_START);
  };

  return (
    <div className="rounded-2xl border-2 border-indigo-200/60 bg-white/85 p-4 shadow-sm space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted">
          Retting av åpne svar
        </p>
        <p className="mt-1 text-sm text-quiz-muted leading-relaxed">
          Velg om åpne svar rettes av deltakerne (retterunde) eller av KI mot fasit. Du kan alltid
          overstyre poeng og behandle protester.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={aiRunning || room.phase === 'grading'}
          onClick={() => setMode('peer')}
          className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
            mode === 'peer'
              ? 'border-violet-500 bg-violet-100 text-violet-900'
              : 'border-indigo-200/70 bg-white text-quiz-muted'
          }`}
        >
          Deltaker-retterunde
        </button>
        <button
          type="button"
          disabled={aiRunning || room.phase === 'grading'}
          onClick={() => setMode('ai')}
          className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
            mode === 'ai'
              ? 'border-cyan-500 bg-cyan-100 text-cyan-900'
              : 'border-indigo-200/70 bg-white text-quiz-muted'
          }`}
        >
          KI-retting
        </button>
      </div>

      {mode === 'ai' && (
        <div className="rounded-xl border border-cyan-300/50 bg-cyan-50/80 px-4 py-3 space-y-3">
          <p className="text-sm text-cyan-950">
            KI vurderer mening og innhold — ikke bare eksakt tekst. Den bruker oppgavetekst, hint og
            godkjente svar, og kan gi delpoeng.
          </p>
          {aiRunning && (
            <div>
              <p className="text-sm font-semibold text-cyan-900">
                Retter {room.aiGrading?.completed ?? 0} av {room.aiGrading?.total ?? 0}…
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-cyan-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {aiDone && (
            <p className="text-sm font-semibold text-green-800">
              KI-retting fullført. Åpne gjennomgang for deltakere når du er klar.
            </p>
          )}
          {aiError && (
            <p className="text-sm font-semibold text-red-800" role="alert">
              {room.aiGrading?.error ?? 'KI-retting feilet.'}
            </p>
          )}
          {!aiRunning && !aiDone && (
            <Button
              type="button"
              variant="cta"
              size="sm"
              disabled={!aiCheck.ok}
              title={aiCheck.ok ? undefined : aiCheck.message}
              onClick={startAi}
            >
              Start KI-retting
            </Button>
          )}
          {aiDone && room.aiGrades.length > 0 && (
            <p className="text-xs text-cyan-900">
              {room.aiGrades.length} vurderinger lagret — se begrunnelse under hver deltaker.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
