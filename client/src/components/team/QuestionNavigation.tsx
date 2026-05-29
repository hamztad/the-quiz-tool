import { formatOppgaveLabel } from '../../lib/participantCopy';
import { ParticipantBackToQuizLink } from './ParticipantBackToQuizLink';

interface QuestionNavigationProps {
  questionNumber: number;
  totalQuestions: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onBackToOverview: () => void;
}

export function QuestionNavigation({
  questionNumber,
  totalQuestions,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onBackToOverview,
}: QuestionNavigationProps) {
  return (
    <div className="mb-4 space-y-3 min-w-0">
      <ParticipantBackToQuizLink onClick={onBackToOverview} className="mb-0" />

      <nav
        className="flex items-stretch gap-2 rounded-2xl border border-indigo-200/80 bg-white/80 p-2 shadow-sm"
        aria-label="Naviger mellom oppgaver"
      >
        {canGoPrev ? (
          <button
            type="button"
            onClick={onPrev}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border-2 border-violet-200 bg-violet-50 px-3 text-sm font-bold text-violet-800 transition-colors hover:border-violet-300 hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
            aria-label="Forrige oppgave"
          >
            <span aria-hidden>←</span>
          </button>
        ) : (
          <span
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border-2 border-transparent px-3 opacity-0 pointer-events-none"
            aria-hidden
          >
            ←
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-quiz-muted">
            {formatOppgaveLabel(questionNumber)}
          </p>
          <p className="text-sm font-bold text-quiz-text tabular-nums">
            {questionNumber} / {totalQuestions}
          </p>
        </div>

        {canGoNext ? (
          <button
            type="button"
            onClick={onNext}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border-2 border-violet-200 bg-violet-50 px-3 text-sm font-bold text-violet-800 transition-colors hover:border-violet-300 hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
            aria-label="Neste oppgave"
          >
            <span aria-hidden>→</span>
          </button>
        ) : (
          <span
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border-2 border-transparent px-3 opacity-0 pointer-events-none"
            aria-hidden
          >
            →
          </span>
        )}
      </nav>
    </div>
  );
}
