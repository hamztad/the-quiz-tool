import { useCallback, useEffect, useState } from 'react';
import type { Question } from '@quiz-tool/shared';
import { UnsavedQuizLeaveDialog } from '../components/host/UnsavedQuizLeaveDialog';

interface UseUnsavedQuizGuardOptions {
  dirty: boolean;
  hasUnexportedQuiz: boolean;
  questions: Question[];
  quizTitle?: string;
  onExported?: () => void;
}

/**
 * Warn before leaving with unsaved quiz work.
 * Uses beforeunload + explicit navigation prompts only (no useBlocker — requires data router).
 */
export function useUnsavedQuizGuard({
  dirty,
  hasUnexportedQuiz,
  questions,
  quizTitle,
  onExported,
}: UseUnsavedQuizGuardOptions) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState<(() => void) | null>(null);
  const shouldWarn = dirty || hasUnexportedQuiz;

  useEffect(() => {
    if (!shouldWarn) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [shouldWarn]);

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
      if (!shouldWarn) {
        navigateFn();
        return;
      }
      setPendingNavigate(() => navigateFn);
      setDialogOpen(true);
    },
    [shouldWarn],
  );

  const dialog = (
    <UnsavedQuizLeaveDialog
      open={dialogOpen}
      questions={questions}
      quizTitle={quizTitle}
      onExported={onExported}
      onStay={cancelLeave}
      onLeave={confirmLeave}
    />
  );

  return { requestLeave, dialog };
}
