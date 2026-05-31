import { builtInGames } from '../games/registry.js';
import type { GameId } from '../games/types.js';
import {
  AI_GENERATE_QUESTION_MAX,
  AI_GENERATE_QUESTION_MIN,
} from './aiQuizTypes.js';
import type { AiShopSlot } from './aiQuizTypes.js';

/** Forhåndsdefinert kurv tilsvarende tidligere «quizpakke» (5 oppgaver). */
export const QUIZ_PACKAGE_PRESET_SLOTS: AiShopSlot[] = [
  { type: 'open' },
  { type: 'mc' },
  { type: 'ordering' },
  { type: 'game', gameId: 'mathExpression' },
  { type: 'game', gameId: 'emojiHunt' },
];

const BUILTIN_GAME_IDS = new Set(builtInGames.map((g) => g.id));

export function validateCartSlots(slots: AiShopSlot[]): string[] {
  const errors: string[] = [];
  if (slots.length < AI_GENERATE_QUESTION_MIN || slots.length > AI_GENERATE_QUESTION_MAX) {
    errors.push(
      `Kurven må ha ${AI_GENERATE_QUESTION_MIN}–${AI_GENERATE_QUESTION_MAX} oppgaver (har ${slots.length}).`,
    );
  }
  slots.forEach((slot, index) => {
    const n = index + 1;
    if (slot.type === 'game') {
      if (!slot.gameId) {
        errors.push(`Oppgave ${n}: spill mangler gameId.`);
      } else if (!BUILTIN_GAME_IDS.has(slot.gameId)) {
        errors.push(`Oppgave ${n}: ukjent spill «${slot.gameId}».`);
      }
    } else if (slot.gameId) {
      errors.push(`Oppgave ${n}: gameId er kun tillatt for spill.`);
    }
  });
  return errors;
}

export function cartSlotsFromCounts(counts: {
  open: number;
  mc: number;
  ordering: number;
  games: Array<{ gameId: GameId }>;
}): AiShopSlot[] {
  const slots: AiShopSlot[] = [];
  for (let i = 0; i < counts.open; i++) slots.push({ type: 'open' });
  for (let i = 0; i < counts.mc; i++) slots.push({ type: 'mc' });
  for (let i = 0; i < counts.ordering; i++) slots.push({ type: 'ordering' });
  for (const g of counts.games) slots.push({ type: 'game', gameId: g.gameId });
  return slots;
}
