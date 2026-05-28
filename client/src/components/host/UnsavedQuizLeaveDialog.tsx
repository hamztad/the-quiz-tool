import { questionsToQuizText, type Question } from '@quiz-tool/shared';
import { downloadQuizFile } from '../../lib/downloadQuizFile';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface UnsavedQuizLeaveDialogProps {
  open: boolean;
  questions: Question[];
  quizTitle?: string;
  onExported?: () => void;
  onStay: () => void;
  onLeave: () => void;
}

export function UnsavedQuizLeaveDialog({
  open,
  questions,
  quizTitle,
  onExported,
  onStay,
  onLeave,
}: UnsavedQuizLeaveDialogProps) {
  const handleCopy = async () => {
    if (questions.length === 0) return;
    try {
      await navigator.clipboard.writeText(questionsToQuizText(questions));
    } catch {
      /* clipboard may fail */
    }
  };

  return (
    <Modal open={open} labelledBy="unsaved-quiz-title" align="center">
      <div className="space-y-4 p-5">
        <div>
          <h2 id="unsaved-quiz-title" className="text-lg font-bold text-quiz-text">
            Quizen er ikke lagret som fil
          </h2>
          <p className="mt-2 text-sm text-quiz-muted leading-relaxed break-words">
            Denne quizen er ikke permanent lagret. Hvis du avslutter nå, kan quizen bli borte fra
            denne økta. Last ned en quizfil hvis du vil bruke den senere.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              downloadQuizFile(questions, { title: quizTitle });
              onExported?.();
            }}
          >
            Last ned quizfil
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleCopy}
            disabled={questions.length === 0}
          >
            Kopier som tekst
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onLeave}>
            Avslutt uten å lagre
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={onStay}>
            Avbryt
          </Button>
        </div>
      </div>
    </Modal>
  );
}
