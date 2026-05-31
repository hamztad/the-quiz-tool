import { useEffect, useRef, useState } from 'react';
import { teamQuestionListAnchorId } from '../lib/teamQuestionListNav';
import {
  isQuestionRevealedToTeam,
  isSelfPacedQuiz,
  type PublicRoomState,
} from '@quiz-tool/shared';
import { formatOppgaveLabel } from '../lib/participantCopy';
import {
  readNotifyOnQuestionOpen,
  showBrowserNotification,
  writeNotifyOnQuestionOpen,
} from '../lib/questionOpenNotifyPrefs';

export interface QuestionOpenToast {
  id: string;
  message: string;
  questionId: string;
}

function findNewlyOpenedQuestionIds(
  prev: Record<string, 'locked' | 'open'> | undefined,
  next: Record<string, 'locked' | 'open'>,
): string[] {
  const opened: string[] = [];
  for (const [id, status] of Object.entries(next)) {
    if (status === 'open' && prev?.[id] !== 'open') {
      opened.push(id);
    }
  }
  return opened;
}

interface UseQuestionOpenNotificationsOptions {
  onNavigateToQuestion?: (questionId: string) => void;
}

export function useQuestionOpenNotifications(
  room: PublicRoomState | null,
  options: UseQuestionOpenNotificationsOptions = {},
) {
  const { onNavigateToQuestion } = options;
  const [notifyEnabled, setNotifyEnabled] = useState(() => readNotifyOnQuestionOpen());
  const [toast, setToast] = useState<QuestionOpenToast | null>(null);

  const prevStatusRef = useRef<Record<string, 'locked' | 'open'> | null>(null);
  const initializedRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  };

  const showToast = (message: string, questionId: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const id = `${questionId}-${Date.now()}`;
    setToast({ id, message, questionId });
    toastTimerRef.current = setTimeout(() => setToast(null), 7000);
  };

  const navigateToQuestion = (questionId: string) => {
    onNavigateToQuestion?.(questionId);
    requestAnimationFrame(() => {
      document
        .getElementById(teamQuestionListAnchorId(questionId))
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  useEffect(() => {
    if (!room) {
      initializedRef.current = false;
      prevStatusRef.current = null;
      return;
    }

    if (room.phase !== 'live' || !notifyEnabled) {
      prevStatusRef.current = room.questionStatus;
      if (room.phase !== 'live') initializedRef.current = false;
      return;
    }

    const prev = prevStatusRef.current;
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevStatusRef.current = room.questionStatus;
      return;
    }

    const newlyOpened = findNewlyOpenedQuestionIds(prev ?? {}, room.questionStatus);
    prevStatusRef.current = room.questionStatus;

    if (newlyOpened.length === 0) return;

    if (isSelfPacedQuiz(room.schedule) && newlyOpened.length > 1) {
      return;
    }

    for (const questionId of newlyOpened) {
      if (!isQuestionRevealedToTeam(room, questionId)) continue;

      const index = room.questions.findIndex((q) => q.id === questionId);
      if (index < 0) continue;

      const label = formatOppgaveLabel(index + 1);
      const message = `${label} er åpen — trykk for å gå dit`;
      const activate = () => navigateToQuestion(questionId);

      showToast(message, questionId);
      showBrowserNotification('Gruiz', `${label} er åpen`, activate, 'gruiz-open');
    }
  }, [room, notifyEnabled, onNavigateToQuestion]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return {
    notifyEnabled,
    setNotifyEnabled: (enabled: boolean) => {
      writeNotifyOnQuestionOpen(enabled);
      setNotifyEnabled(enabled);
    },
    toast,
    dismissToast,
    navigateToQuestion,
  };
}
