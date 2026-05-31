import { getBuiltInGame } from '../games/registry.js';
import type { Question } from '../types/room.js';

/** Tekst brukt til bildesøk (norsk) for oppgaver og spill. */
export function questionImageSearchQuery(
  question: Pick<Question, 'type' | 'lines' | 'options' | 'acceptedAnswers' | 'gameType'>,
): string {
  const title = question.lines[0]?.text?.trim() ?? '';
  if (question.type === 'game') {
    const gameLabel = question.gameType ? getBuiltInGame(question.gameType)?.label : undefined;
    return [title, gameLabel].filter(Boolean).join(' ').slice(0, 80);
  }
  const correct =
    question.type === 'mc'
      ? question.options?.find((o) => o.isCorrect)?.text?.trim()
      : question.acceptedAnswers?.[0]?.trim();
  return [title, correct].filter(Boolean).join(' ').slice(0, 80);
}

export function questionSupportsImportImage(question: Pick<Question, 'type'>): boolean {
  return (
    question.type === 'open' ||
    question.type === 'mc' ||
    question.type === 'ordering' ||
    question.type === 'game'
  );
}

export function questionHasImageMedia(question: Pick<Question, 'media'>): boolean {
  return Boolean(question.media?.some((m) => m.type === 'image' && m.url.trim()));
}
