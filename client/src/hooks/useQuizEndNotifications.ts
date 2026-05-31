import { useEffect, useRef, useState } from 'react';
import type { PublicRoomState } from '@quiz-tool/shared';
import {
  detectQuizEndNotifyEvents,
  quizEndNotifyBrowserBody,
  quizEndNotifyMessage,
  snapshotQuizEndNotifyState,
  type QuizEndNotifyEvent,
} from '../lib/quizEndNotify';
import {
  readNotifyOnQuizEnd,
  showBrowserNotification,
  writeNotifyOnQuizEnd,
} from '../lib/questionOpenNotifyPrefs';

export interface QuizEndToast {
  id: string;
  message: string;
  event: QuizEndNotifyEvent;
}

interface UseQuizEndNotificationsOptions {
  onActivate?: () => void;
}

export function useQuizEndNotifications(
  room: PublicRoomState | null,
  options: UseQuizEndNotificationsOptions = {},
) {
  const { onActivate } = options;
  const [notifyEnabled, setNotifyEnabled] = useState(() => readNotifyOnQuizEnd());
  const [toast, setToast] = useState<QuizEndToast | null>(null);

  const prevSnapshotRef = useRef<ReturnType<typeof snapshotQuizEndNotifyState> | null>(null);
  const initializedRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  };

  const showToast = (event: QuizEndNotifyEvent) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const id = `${event}-${Date.now()}`;
    const message = quizEndNotifyMessage(event);
    setToast({ id, message, event });
    toastTimerRef.current = setTimeout(() => setToast(null), 10_000);
  };

  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;

  const activate = () => {
    onActivateRef.current?.();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!room) {
      initializedRef.current = false;
      prevSnapshotRef.current = null;
      return;
    }

    const next = snapshotQuizEndNotifyState(room);

    if (!notifyEnabled) {
      prevSnapshotRef.current = next;
      initializedRef.current = true;
      return;
    }

    const events = detectQuizEndNotifyEvents(
      prevSnapshotRef.current,
      next,
      initializedRef.current,
    );

    prevSnapshotRef.current = next;
    initializedRef.current = true;

    for (const event of events) {
      showToast(event);
      showBrowserNotification(
        'Gruiz',
        quizEndNotifyBrowserBody(event),
        activate,
        event === 'final_result_locked' ? 'gruiz-final' : 'gruiz-end',
      );
    }
  }, [room, notifyEnabled]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  return {
    notifyEnabled,
    setNotifyEnabled: (enabled: boolean) => {
      writeNotifyOnQuizEnd(enabled);
      setNotifyEnabled(enabled);
    },
    toast,
    dismissToast,
    activate,
  };
}
