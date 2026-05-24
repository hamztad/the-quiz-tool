import { questionsToQuizText, type Question } from '@quiz-tool/shared';
import { downloadQuizFile } from '../../lib/downloadQuizFile';
import { Button } from '../ui/Button';

interface UnsavedQuizLeaveDialogProps {
  open: boolean;
  questions: Question[];
  quizTitle?: string;
  onStay: () => void;
  onLeave: () => void;
}

export function UnsavedQuizLeaveDialog({
  open,
  questions,
  quizTitle,
  onStay,
  onLeave,
}: UnsavedQuizLeaveDialogProps) {
  if (!open) return null;

  const handleCopy = async () => {
    if (questions.length === 0) return;
    try {
      await navigator.clipboard.writeText(questionsToQuizText(questions));
    } catch {
      /* clipboard may fail */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-quiz-title"
    >
      <div className="w-full max-w-md min-w-0 rounded-2xl border border-quiz-border bg-quiz-surface p-5 shadow-xl space-y-4">
        <div>
          <h2 id="unsaved-quiz-title" className="text-lg font-bold text-quiz-text">
            Ulagrede endringer
          </h2>
          <p className="mt-2 text-sm text-quiz-muted leading-relaxed break-words">
            Denne quizen er ikke permanent lagret ennå. Vil du laste ned eller eksportere quizen
            før du lukker?
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" className="w-full" onClick={() => downloadQuizFile(questions, { title: quizTitle })}>
            Last ned quizfil
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={handleCopy} disabled={questions.length === 0}>
            Kopier som tekst
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onLeave}>
            Fortsett uten å lagre
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={onStay}>
            Bli og lagre
          </Button>
        </div>
      </div>
    </div>
  );
}