import type { PublicRoomState } from '@quiz-tool/shared';
import type { useQuestionOpenNotifications } from '../../hooks/useQuestionOpenNotifications';
import { QuestionOpenNotifyToggle } from './QuestionOpenNotifyToggle';
import { QuestionOpenToast } from './QuestionOpenToast';

type Notifications = ReturnType<typeof useQuestionOpenNotifications>;

interface TeamQuestionNotifyLayerProps {
  room: PublicRoomState;
  notifications: Notifications;
}

export function TeamQuestionNotifyLayer({ room, notifications }: TeamQuestionNotifyLayerProps) {
  const { notifyEnabled, setNotifyEnabled, toast, dismissToast, navigateToQuestion } =
    notifications;

  return (
    <>
      <QuestionOpenNotifyToggle
        room={room}
        enabled={notifyEnabled}
        onEnabledChange={setNotifyEnabled}
      />
      {toast && (
        <QuestionOpenToast
          toast={toast}
          onDismiss={dismissToast}
          onActivate={() => {
            navigateToQuestion(toast.questionId);
            dismissToast();
          }}
        />
      )}
    </>
  );
}
