import { Card } from '../ui/Card';
import {
  participantQuestionLockedMessage,
  type ParticipantQuestionViewState,
} from '../../lib/participantQuestionAccess';
import { formatOppgaveLabel } from '../../lib/participantCopy';

interface QuestionLockedPlaceholderProps {
  questionNumber: number;
  viewState: Exclude<ParticipantQuestionViewState, 'available'>;
}

export function QuestionLockedPlaceholder({
  questionNumber,
  viewState,
}: QuestionLockedPlaceholderProps) {
  return (
    <Card className="border-2 border-dashed border-indigo-200/90 bg-indigo-50/40 p-6 text-center min-w-0">
      <p className="text-3xl" aria-hidden>
        🔒
      </p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-quiz-muted">
        {formatOppgaveLabel(questionNumber)}
      </p>
      <p className="mt-2 text-base font-bold text-quiz-text">
        {participantQuestionLockedMessage(viewState)}
      </p>
      <p className="mt-2 text-sm text-quiz-muted leading-relaxed">
        Bruk pilene over for å bla til andre oppgaver, eller gå tilbake til oversikten.
      </p>
    </Card>
  );
}
