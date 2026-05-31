import type { PublicRoomState } from '@quiz-tool/shared';
import type { useQuestionOpenNotifications } from '../../hooks/useQuestionOpenNotifications';
import type { useQuizEndNotifications } from '../../hooks/useQuizEndNotifications';
import { ParticipantEmailNotifyCard } from './ParticipantEmailNotifyCard';
import { QuestionOpenNotifyToggle } from './QuestionOpenNotifyToggle';
import { QuizEndNotifyToggle } from './QuizEndNotifyToggle';

type QuestionNotifications = ReturnType<typeof useQuestionOpenNotifications>;
type QuizEndNotifications = ReturnType<typeof useQuizEndNotifications>;

interface TeamQuestionNotifyLayerProps {
  room: PublicRoomState;
  questionNotifications: QuestionNotifications;
  quizEndNotifications: QuizEndNotifications;
}

/** In-flow toggles for participant notifications (toasts render via ParticipantNotifyToasts). */
export function TeamQuestionNotifyLayer({
  room,
  questionNotifications,
  quizEndNotifications,
}: TeamQuestionNotifyLayerProps) {
  return (
    <div className="space-y-3">
      <ParticipantEmailNotifyCard room={room} />
      <QuizEndNotifyToggle
        room={room}
        enabled={quizEndNotifications.notifyEnabled}
        onEnabledChange={quizEndNotifications.setNotifyEnabled}
      />
      <QuestionOpenNotifyToggle
        room={room}
        enabled={questionNotifications.notifyEnabled}
        onEnabledChange={questionNotifications.setNotifyEnabled}
      />
    </div>
  );
}
