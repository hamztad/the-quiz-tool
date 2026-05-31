import { builtInGames } from '../games/registry.js';
import type { GameId } from '../games/types.js';
import {
  AI_GENERATE_QUESTION_MAX,
  AI_GENERATE_QUESTION_MIN,
  AI_SHOP_ORDERING_DEFAULT_ITEMS,
  AI_SHOP_ORDERING_MAX_ITEMS,
  AI_SHOP_ORDERING_MIN_ITEMS,
  type AiShopTypeThemes,
} from './aiQuizTypes.js';
import type { AiShopSlot } from './aiQuizTypes.js';

/** Én Regnerace-oppgave — spill genererer regnestykker underveis. */
export const REGNERACE_ONLY_SLOTS: AiShopSlot[] = [{ type: 'game', gameId: 'mathExpression' }];

/** Forhåndsdefinert kurv tilsvarende tidligere «quizpakke» (5 oppgaver). */
export const QUIZ_PACKAGE_PRESET_SLOTS: AiShopSlot[] = [
  { type: 'open' },
  { type: 'mc' },
  { type: 'ordering', orderingItemCount: AI_SHOP_ORDERING_DEFAULT_ITEMS },
  { type: 'game', gameId: 'mathExpression' },
  { type: 'game', gameId: 'emojiHunt' },
];

const BUILTIN_GAME_IDS = new Set(builtInGames.map((g) => g.id));

export function clampOrderingItemCount(count: number): number {
  const rounded = Math.round(count);
  return Math.min(
    AI_SHOP_ORDERING_MAX_ITEMS,
    Math.max(AI_SHOP_ORDERING_MIN_ITEMS, rounded),
  );
}

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
    if (slot.type === 'ordering' && slot.orderingItemCount !== undefined) {
      const c = slot.orderingItemCount;
      if (c < AI_SHOP_ORDERING_MIN_ITEMS || c > AI_SHOP_ORDERING_MAX_ITEMS) {
        errors.push(
          `Oppgave ${n}: rekkefølge må ha ${AI_SHOP_ORDERING_MIN_ITEMS}–${AI_SHOP_ORDERING_MAX_ITEMS} elementer.`,
        );
      }
    }
  });
  return errors;
}

export function cartSlotsFromCounts(counts: {
  open: number;
  mc: number;
  ordering: number;
  games: Array<{ gameId: GameId }>;
  themes?: AiShopTypeThemes;
  orderingItemCount?: number;
}): AiShopSlot[] {
  const itemCount = clampOrderingItemCount(
    counts.orderingItemCount ?? AI_SHOP_ORDERING_DEFAULT_ITEMS,
  );
  const slots: AiShopSlot[] = [];
  for (let i = 0; i < counts.open; i++) {
    slots.push({
      type: 'open',
      topic: counts.themes?.open?.trim() || undefined,
    });
  }
  for (let i = 0; i < counts.mc; i++) {
    slots.push({
      type: 'mc',
      topic: counts.themes?.mc?.trim() || undefined,
    });
  }
  for (let i = 0; i < counts.ordering; i++) {
    slots.push({
      type: 'ordering',
      topic: counts.themes?.ordering?.trim() || undefined,
      orderingItemCount: itemCount,
    });
  }
  for (const g of counts.games) {
    slots.push({ type: 'game', gameId: g.gameId });
  }
  return slots;
}
