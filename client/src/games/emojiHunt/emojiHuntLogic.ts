import type { EmojiHuntOption } from './emojiHuntTypes';

export const EMOJI_HUNT_EMOJIS = [
  '😀',
  '😂',
  '😍',
  '😎',
  '🤩',
  '😱',
  '🥶',
  '😈',
  '👻',
  '🤖',
  '🐶',
  '🐱',
  '🦊',
  '🐼',
  '🐸',
  '🦄',
  '🍕',
  '🍔',
  '🍓',
  '🍩',
  '⚽',
  '🎲',
  '🚀',
  '🌈',
  '🔥',
  '⭐',
  '🌙',
  '☂️',
  '🎯',
  '💎',
];

/** Bredde som matcher typisk mobil — spillfeltet sentreres på større skjermer. */
export const EMOJI_HUNT_MOBILE_PLAYFIELD_MAX_WIDTH_PX = 390;

export const EMOJI_HUNT_POSITIONS = [
  { left: 50, top: 9 },
  { left: 64, top: 12 },
  { left: 77, top: 18 },
  { left: 88, top: 29 },
  { left: 92, top: 43 },
  { left: 88, top: 57 },
  { left: 77, top: 68 },
  { left: 64, top: 74 },
  { left: 50, top: 77 },
  { left: 36, top: 74 },
  { left: 23, top: 68 },
  { left: 12, top: 57 },
  { left: 8, top: 43 },
  { left: 12, top: 29 },
  { left: 23, top: 18 },
  { left: 36, top: 12 },
  { left: 50, top: 22 },
  { left: 78, top: 50 },
  { left: 50, top: 64 },
  { left: 22, top: 50 },
];

export function shuffleEmojiHuntItems<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickEmojiHuntTargets(count: number): string[] {
  return shuffleEmojiHuntItems(EMOJI_HUNT_EMOJIS).slice(0, count);
}

export function buildEmojiHuntOptions(
  remainingTargets: string[],
  optionCount: number,
): EmojiHuntOption[] {
  const needed = new Set(remainingTargets);
  const filler = shuffleEmojiHuntItems(EMOJI_HUNT_EMOJIS.filter((emoji) => !needed.has(emoji)))
    .slice(0, Math.max(0, optionCount - remainingTargets.length));
  return shuffleEmojiHuntItems([...remainingTargets, ...filler])
    .slice(0, optionCount)
    .map((emoji, index) => ({ id: `${emoji}-${index}-${Math.random()}`, emoji }));
}
