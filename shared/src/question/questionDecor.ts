import type { Question, QuestionType } from '../types/room.js';

const TYPE_DECOR_EMOJI: Record<QuestionType, string> = {
  open: '💬',
  mc: '❓',
  ordering: '🧩',
  game: '🎲',
};

const GAME_DECOR_EMOJI: Partial<Record<string, string>> = {
  anagram: '🔤',
  mathExpression: '➗',
  dropBall: '🎮',
  emojiHunt: '🔍',
  rainbowPuzzle: '🌈',
  timerChallenge: '⏱️',
  revealImage: '🖼️',
};

const MATH_RACE_DECOR_EMOJI = '🏃';

/** Question has an illustration — auto/custom emoji must not show. */
export function questionHasDecorImage(
  question: Pick<Question, 'media'>,
): boolean {
  return (question.media ?? []).some((item) => item.type === 'image' && item.url.trim().length > 0);
}

/** Default emoji by question type (and game when relevant). */
export function getAutoQuestionDecorEmoji(
  question: Pick<Question, 'type'> & { game?: Question['game'] },
): string {
  if (question.type === 'game') {
    const gameId = question.game?.gameId;
    if (question.game?.gameId === 'mathExpression') {
      return question.game.mode === 'race' ? MATH_RACE_DECOR_EMOJI : GAME_DECOR_EMOJI.mathExpression!;
    }
    if (gameId && GAME_DECOR_EMOJI[gameId]) {
      return GAME_DECOR_EMOJI[gameId]!;
    }
    return TYPE_DECOR_EMOJI.game;
  }
  return TYPE_DECOR_EMOJI[question.type];
}

export function normalizeQuestionDecorEmoji(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/\p{Extended_Pictographic}/u);
  return match?.[0];
}

/** Emoji shown on the card: QM choice, else auto, unless the question has an image. */
export function resolveQuestionDecorEmoji(
  question: Pick<Question, 'type' | 'media' | 'decorEmoji'> & { game?: Question['game'] },
): string | null {
  if (questionHasDecorImage(question)) return null;
  const custom = normalizeQuestionDecorEmoji(question.decorEmoji);
  if (custom) return custom;
  return getAutoQuestionDecorEmoji(question);
}

export const QUESTION_DECOR_EMOJI_SUGGESTIONS: Record<QuestionType, readonly string[]> = {
  open: ['💬', '✍️', '📝', '💭', '🗣️', '❓'],
  mc: ['❓', '🧠', '💡', '🎯', '✅', '🔤'],
  ordering: ['🧩', '📊', '🔢', '📋', '↕️', '🏆'],
  game: ['🎲', '🎮', '🏆', '⭐', '🔥', '✨'],
};

export function getQuestionDecorEmojiSuggestions(
  question: Pick<Question, 'type'> & { game?: Question['game'] },
): string[] {
  const auto = getAutoQuestionDecorEmoji(question);
  const base = [...QUESTION_DECOR_EMOJI_SUGGESTIONS[question.type]];
  if (question.type === 'game' && question.game?.gameId) {
    const gameEmoji = getAutoQuestionDecorEmoji(question);
    return [...new Set([gameEmoji, auto, ...base])];
  }
  return [...new Set([auto, ...base])];
}
