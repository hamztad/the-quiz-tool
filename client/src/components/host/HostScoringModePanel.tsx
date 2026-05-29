import { CLIENT_EVENTS, canChangeScoringMode, type PublicRoomState, type QuizScoringMode } from '@quiz-tool/shared';
import { useSocket } from '../../hooks/useSocket';

interface HostScoringModePanelProps {
  room: PublicRoomState;
}

export function HostScoringModePanel({ room }: HostScoringModePanelProps) {
  const { socket } = useSocket();
  const mode = room.settings.scoringMode ?? 'ranking';
  const changeCheck = canChangeScoringMode(room);
  const locked = !changeCheck.ok;

  const setMode = (next: QuizScoringMode) => {
    if (next === mode || locked) return;
    socket.emit(CLIENT_EVENTS.SETTINGS_SCORING_MODE_SET, { mode: next });
  };

  return (
    <div className="rounded-2xl border-2 border-violet-200/60 bg-white/85 p-4 shadow-sm space-y-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted">Poengmodus</p>
        <p className="mt-1 text-sm text-quiz-muted leading-relaxed">
          Rangering gir 5/3/1 quizpoeng per oppgave. Prestasjonspoeng bruker råresultat og skala
          der 10&nbsp;000 er sterk prestasjon — uten tak per oppgave.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={locked}
          onClick={() => setMode('ranking')}
          className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
            mode === 'ranking'
              ? 'border-violet-500 bg-violet-100 text-violet-900'
              : 'border-indigo-200/70 bg-white text-quiz-muted'
          }`}
        >
          Rangering
        </button>
        <button
          type="button"
          disabled={locked}
          onClick={() => setMode('performance')}
          className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
            mode === 'performance'
              ? 'border-amber-500 bg-amber-100 text-amber-950'
              : 'border-indigo-200/70 bg-white text-quiz-muted'
          }`}
        >
          Prestasjonspoeng
        </button>
      </div>
      {locked && (
        <p className="text-xs font-medium text-amber-900">{changeCheck.message}</p>
      )}
      {mode === 'performance' && !locked && (
        <p className="text-xs text-quiz-muted">
          Spill med poengbånd viser ikke rangering-bånd i editoren. Emoji-jakt scores alltid som 3
          mål i denne modusen.
        </p>
      )}
    </div>
  );
}
