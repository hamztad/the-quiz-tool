import type { Question } from '@quiz-tool/shared';

export interface QuestionTypeTheme {
  emoji: string;
  label: string;
  accentClass: string;
  cardClass: string;
  badgeClass: string;
}

const themes: Record<Question['type'], QuestionTypeTheme> = {
  mc: {
    emoji: '❓',
    label: 'Flervalg',
    accentClass: 'from-violet-500 to-indigo-500',
    cardClass: 'border-violet-300/50 bg-gradient-to-br from-violet-50/90 to-white/95',
    badgeClass: 'bg-violet-100 text-violet-800 border-violet-300/60',
  },
  open: {
    emoji: '💬',
    label: 'Åpent svar',
    accentClass: 'from-amber-500 to-orange-500',
    cardClass: 'border-amber-300/50 bg-gradient-to-br from-amber-50/90 to-white/95',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300/60',
  },
  ordering: {
    emoji: '🧩',
    label: 'Rekkefølge',
    accentClass: 'from-cyan-500 to-teal-500',
    cardClass: 'border-cyan-300/50 bg-gradient-to-br from-cyan-50/90 to-white/95',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300/60',
  },
  game: {
    emoji: '🎲',
    label: 'Spill',
    accentClass: 'from-fuchsia-500 to-purple-600',
    cardClass: 'border-fuchsia-300/50 bg-gradient-to-br from-fuchsia-50/90 to-white/95',
    badgeClass: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300/60',
  },
};

const gameEmoji: Partial<Record<string, string>> = {
  anagram: '🔤',
  mathExpression: '➗',
  dropBall: '🎮',
  emojiHunt: '🔍',
  rainbowPuzzle: '🌈',
  timerChallenge: '⏱️',
};

export function getQuestionTypeTheme(
  question: Pick<Question, 'type'> & { game?: { gameId?: string } | null },
): QuestionTypeTheme {
  const base = themes[question.type];
  const gameId = question.type === 'game' ? question.game?.gameId : undefined;
  if (!gameId) {
    return base;
  }
  const emoji = gameEmoji[gameId] ?? base.emoji;
  return { ...base, emoji };
}
