import type { Question } from '../types/room.js';

/** Tekst brukt til bildesøk (norsk) for åpne/MC/rekkefølge-spørsmål. */
export function questionImageSearchQuery(question: Pick<Question, 'type' | 'lines' | 'options' | 'acceptedAnswers'>): string {
  const title = question.lines[0]?.text?.trim() ?? '';
  const correct =
    question.type === 'mc'
      ? question.options?.find((o) => o.isCorrect)?.text?.trim()
      : question.acceptedAnswers?.[0]?.trim();
  return [title, correct].filter(Boolean).join(' ').slice(0, 80);
}

export function questionSupportsImportImage(question: Pick<Question, 'type'>): boolean {
  return question.type === 'open' || question.type === 'mc' || question.type === 'ordering';
}

export function questionHasImageMedia(question: Pick<Question, 'media'>): boolean {
  return Boolean(question.media?.some((m) => m.type === 'image' && m.url.trim()));
}
