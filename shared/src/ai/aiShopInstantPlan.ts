import {
  AI_QUIZ_THEME_PRESETS,
  AI_SHOP_ORDERING_DEFAULT_ITEMS,
} from './aiQuizTypes.js';
import type { AiShopSlot } from './aiQuizTypes.js';
import type { GameId } from '../games/types.js';

export const AI_SHOP_INSTANT_QUESTION_COUNT = 10;

/** Spill som kan velges automatisk uten bildeoppsett i editoren. */
export const AI_SHOP_INSTANT_GAME_IDS: GameId[] = [
  'mathExpression',
  'dropBall',
  'rainbowPuzzle',
  'emojiHunt',
  'timerChallenge',
];

const INSTANT_TYPE_COUNTS = {
  open: 3,
  mc: 3,
  ordering: 1,
  game: 3,
} as const;

export function pickInstantTopic(random: () => number = Math.random): string {
  const index = Math.floor(random() * AI_QUIZ_THEME_PRESETS.length);
  return AI_QUIZ_THEME_PRESETS[index] ?? AI_QUIZ_THEME_PRESETS[0];
}

function pickInstantGameId(random: () => number): GameId {
  const pool = AI_SHOP_INSTANT_GAME_IDS.filter((id) => id !== 'mathExpression');
  return pool[Math.floor(random() * pool.length)] ?? 'dropBall';
}

/** Bygg nøyaktig 10 slots for instant-generering. */
export function buildInstantSlots(random: () => number = Math.random): AiShopSlot[] {
  const slots: AiShopSlot[] = [];
  for (let i = 0; i < INSTANT_TYPE_COUNTS.open; i++) slots.push({ type: 'open' });
  for (let i = 0; i < INSTANT_TYPE_COUNTS.mc; i++) slots.push({ type: 'mc' });
  for (let i = 0; i < INSTANT_TYPE_COUNTS.ordering; i++) {
    slots.push({
      type: 'ordering',
      orderingItemCount: AI_SHOP_ORDERING_DEFAULT_ITEMS,
    });
  }
  slots.push({ type: 'game', gameId: 'mathExpression' });
  for (let i = 1; i < INSTANT_TYPE_COUNTS.game; i++) {
    slots.push({ type: 'game', gameId: pickInstantGameId(random) });
  }
  return slots;
}
