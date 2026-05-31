import type { useQuestionOpenNotifications } from '../../hooks/useQuestionOpenNotifications';
import type { useQuizEndNotifications } from '../../hooks/useQuizEndNotifications';
import { QuestionOpenToast } from './QuestionOpenToast';

type QuestionNotifications = ReturnType<typeof useQuestionOpenNotifications>;
type QuizEndNotifications = ReturnType<typeof useQuizEndNotifications>;

interface ParticipantNotifyToastsProps {
  questionNotifications: QuestionNotifications;
  quizEndNotifications: QuizEndNotifications;
}

/** Fixed toasts — mount once per TeamPage so varsler vises i alle faser. */
export function ParticipantNotifyToasts({
  questionNotifications,
  quizEndNotifications,
}: ParticipantNotifyToastsProps) {
  const { toast: questionToast, dismissToast: dismissQuestionToast, navigateToQuestion } =
    questionNotifications;
  const { toast: quizEndToast, dismissToast: dismissQuizEndToast, activate: activateQuizEnd } =
    quizEndNotifications;

  if (!questionToast && !quizEndToast) return null;

  return (
    <>
      {questionToast && (
        <QuestionOpenToast
          toast={questionToast}
          onDismiss={dismissQuestionToast}
          onActivate={() => {
            navigateToQuestion(questionToast.questionId);
            dismissQuestionToast();
          }}
        />
      )}
      {quizEndToast && (
        <QuestionOpenToast
          toast={quizEndToast}
          onDismiss={dismissQuizEndToast}
          onActivate={() => {
            activateQuizEnd();
            dismissQuizEndToast();
          }}
          activateLabel="Se resultater"
        />
      )}
    </>
  );
}
