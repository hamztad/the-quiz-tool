import { useCallback, useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import type { Question } from '@quiz-tool/shared';
import { UnsavedQuizLeaveDialog } from '../components/host/UnsavedQuizLeaveDialog';

interface UseUnsavedQuizGuardOptions {
  dirty: boolean;
  questions: Question[];
  quizTitle?: string;
}

export function useUnsavedQuizGuard({ dirty, questions, quizTitle }: UseUnsavedQuizGuardOptions) {
  const [manualOpen, setManualOpen] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState<(() => void) | null>(null);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const dialogOpen = manualOpen || blocker.state === 'blocked';

  const confirmLeave = useCallback(() => {
    setManualOpen(false);
    if (blocker.state === 'blocked') {
      blocker.proceed?.();
    }
    pendingNavigate?.();
    setPendingNavigate(null);
  }, [blocker, pendingNavigate]);

  const cancelLeave = useCallback(() => {
    setManualOpen(false);
    if (blocker.state === 'blocked') {
      blocker.reset?.();
    }
    setPendingNavigate(null);
  }, [blocker]);

  const requestLeave = useCallback(
    (navigateFn: () => void) => {
      if (!dirty) {
        navigateFn();
        return;
      }
      setPendingNavigate(() => navigateFn);
      setManualOpen(true);
    },
    [dirty],
  );

  const dialog = (
    <UnsavedQuizLeaveDialog
      open={dialogOpen}
      questions={questions}
      quizTitle={quizTitle}
      onStay={cancelLeave}
      onLeave={confirmLeave}
    />
  );

  return { requestLeave, dialog };
}
