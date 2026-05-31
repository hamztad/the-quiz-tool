import { formatOppgaveLabel } from '../../lib/participantCopy';
import { scrollToParticipantGameRetry } from '../../lib/participantGameComplete';

interface GameCompleteNavigationProps {
  questionNumber: number;
  totalQuestions: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  canRetry: boolean;
  visible: boolean;
  onDismissForRetry: () => void;
  onBackToOverview: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const navBtnClass =
  'flex min-h-[48px] items-center justify-center rounded-xl border-2 font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500';

const arrowBtnClass = `${navBtnClass} flex-1 min-w-[4.25rem] max-w-[6rem] text-lg`;

export function GameCompleteNavigation({
  questionNumber,
  totalQuestions,
  canGoPrev,
  canGoNext,
  canRetry,
  visible,
  onDismissForRetry,
  onBackToOverview,
  onPrev,
  onNext,
}: GameCompleteNavigationProps) {
  const handleStay = () => {
    if (canRetry) {
      onDismissForRetry();
      scrollToParticipantGameRetry();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      role="region"
      aria-label="Navigasjon etter spill"
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border-2 border-emerald-300/70 bg-gradient-to-b from-white/95 to-emerald-50/95 p-3 shadow-lg shadow-emerald-900/10 backdrop-blur-sm">
        <p className="mb-2 text-center text-xs font-semibold text-emerald-900">
          Spill fullført — hva vil du gjøre nå?
        </p>
        <p className="mb-3 text-center text-[11px] text-quiz-muted tabular-nums">
          {formatOppgaveLabel(questionNumber)} · {questionNumber} / {totalQuestions}
        </p>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onBackToOverview}
            className={`${navBtnClass} w-full max-w-[12rem] border-violet-300 bg-violet-100 text-violet-900 hover:bg-violet-200`}
            aria-label="Tilbake til oppgavelisten"
          >
            <span className="text-lg leading-none" aria-hidden>
              ▲
            </span>
            <span className="ml-2 text-sm">Oppgaveliste</span>
          </button>

          <div className="flex w-full items-center justify-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={!canGoPrev}
              className={`${arrowBtnClass} border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-35`}
              aria-label="Forrige oppgave"
            >
              <span aria-hidden>←</span>
            </button>
            <button
              type="button"
              onClick={handleStay}
              className={`${navBtnClass} min-w-[7.5rem] flex-[1.4] max-w-[11rem] border-emerald-400 bg-emerald-100 text-emerald-950 hover:bg-emerald-200`}
            >
              <span className="text-sm">{canRetry ? 'Prøv igjen' : 'Bli her'}</span>
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!canGoNext}
              className={`${arrowBtnClass} border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-35`}
              aria-label="Neste oppgave"
            >
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
