import { useCallback, useEffect, useRef } from 'react';
import { scrollTeamQuestionIntoView } from '../lib/teamQuestionListNav';

const HIGHLIGHT_MS = 5_000;
const SCROLL_DELAY_MS = 50;
const SCROLL_RETRY_MS = 80;
const SCROLL_MAX_ATTEMPTS = 8;

/**
 * When leaving question detail (activeQuestionId → null), scroll the list to the task
 * the participant was viewing and highlight it briefly.
 */
export function useScrollToQuestionOnListReturn(
  activeQuestionId: string | null,
  setHighlightedQuestionId: (id: string | null) => void,
) {
  const pendingScrollQuestionId = useRef<string | null>(null);

  const prepareReturnToQuizList = useCallback((fromQuestionId: string | null) => {
    if (fromQuestionId) {
      pendingScrollQuestionId.current = fromQuestionId;
    }
  }, []);

  useEffect(() => {
    if (activeQuestionId !== null) return;
    const questionId = pendingScrollQuestionId.current;
    if (!questionId) return;
    pendingScrollQuestionId.current = null;

    let attempts = 0;
    let scrollTimer: number | undefined;
    let clearHighlightTimer: number | undefined;

    const tryScroll = () => {
      if (scrollTeamQuestionIntoView(questionId) || attempts >= SCROLL_MAX_ATTEMPTS) {
        setHighlightedQuestionId(questionId);
        clearHighlightTimer = window.setTimeout(() => {
          setHighlightedQuestionId(null);
        }, HIGHLIGHT_MS);
        return;
      }
      attempts += 1;
      scrollTimer = window.setTimeout(tryScroll, SCROLL_RETRY_MS);
    };

    scrollTimer = window.setTimeout(tryScroll, SCROLL_DELAY_MS);

    return () => {
      if (scrollTimer !== undefined) window.clearTimeout(scrollTimer);
      if (clearHighlightTimer !== undefined) window.clearTimeout(clearHighlightTimer);
    };
  }, [activeQuestionId, setHighlightedQuestionId]);

  return prepareReturnToQuizList;
}
