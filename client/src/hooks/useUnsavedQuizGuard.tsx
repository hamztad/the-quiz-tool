import { useCallback, useEffect, useState } from 'react';
import type { Question } from '@quiz-tool/shared';
import { UnsavedQuizLeaveDialog } from '../components/host/UnsavedQuizLeaveDialog';

interface UseUnsavedQuizGuardOptions {
  dirty: boolean;
  questions: Question[];
  quizTitle?: string;
}

/**
 * Warn before leaving with unsaved quiz work.
 * Uses beforeunload + explicit navigation prompts only (no useBlocker — requires data router).
 */
export function useUnsavedQuizGuard({ dirty, questions, quizTitle }: UseUnsavedQuizGuardOptions) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const confirmLeave = useCallback(() => {
    setDialogOpen(false);
    pendingNavigate?.();
    setPendingNavigate(null);
  }, [pendingNavigate]);

  const cancelLeave = useCallback(() => {
    setDialogOpen(false);
    setPendingNavigate(null);
  }, []);

  const requestLeave = useCallback(
    (navigateFn: () => void) => {
      if (!dirty) {
        navigateFn();
        return;
      }
      setPendingNavigate(() => navigateFn);
      setDialogOpen(true);
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
