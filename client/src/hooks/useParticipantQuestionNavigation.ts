import { useCallback, useEffect } from 'react';
import type { Question } from '@quiz-tool/shared';

interface UseParticipantQuestionNavigationOptions {
  questions: Question[];
  activeQuestionId: string | null;
  setActiveQuestionId: (questionId: string | null) => void;
  onSelectQuestion: (question: Question) => void;
  enabled?: boolean;
}

export function useParticipantQuestionNavigation({
  questions,
  activeQuestionId,
  setActiveQuestionId,
  onSelectQuestion,
  enabled = true,
}: UseParticipantQuestionNavigationOptions) {
  const activeIndex = activeQuestionId
    ? questions.findIndex((question) => question.id === activeQuestionId)
    : -1;
  const totalQuestions = questions.length;
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex >= 0 && activeIndex < totalQuestions - 1;

  const navigateToIndex = useCallback(
    (index: number) => {
      const question = questions[index];
      if (!question) return;
      onSelectQuestion(question);
      setActiveQuestionId(question.id);
    },
    [questions, onSelectQuestion, setActiveQuestionId],
  );

  const goPrev = useCallback(() => {
    if (canGoPrev) navigateToIndex(activeIndex - 1);
  }, [activeIndex, canGoPrev, navigateToIndex]);

  const goNext = useCallback(() => {
    if (canGoNext) navigateToIndex(activeIndex + 1);
  }, [activeIndex, canGoNext, navigateToIndex]);

  const navigateToQuestionId = useCallback(
    (questionId: string) => {
      const index = questions.findIndex((question) => question.id === questionId);
      if (index >= 0) navigateToIndex(index);
    },
    [navigateToIndex, questions],
  );

  useEffect(() => {
    if (!enabled || activeQuestionId === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeQuestionId, enabled, goNext, goPrev]);

  return {
    activeIndex,
    totalQuestions,
    canGoPrev,
    canGoNext,
    goPrev,
    goNext,
    navigateToIndex,
    navigateToQuestionId,
  };
}
