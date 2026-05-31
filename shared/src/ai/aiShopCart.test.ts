import { describe, expect, it } from 'vitest';
import {
  AI_SHOP_ORDERING_DEFAULT_ITEMS,
  AI_SHOP_ORDERING_MIN_ITEMS,
} from './aiQuizTypes.js';
import {
  cartSlotsFromCounts,
  clampOrderingItemCount,
  QUIZ_PACKAGE_PRESET_SLOTS,
  validateCartSlots,
} from './aiShopCart.js';

describe('aiShopCart', () => {
  it('validates quiz package preset', () => {
    expect(validateCartSlots(QUIZ_PACKAGE_PRESET_SLOTS)).toEqual([]);
    expect(QUIZ_PACKAGE_PRESET_SLOTS).toHaveLength(5);
  });

  it('rejects too few slots', () => {
    expect(validateCartSlots([{ type: 'open' }]).length).toBeGreaterThan(0);
  });

  it('requires gameId on game slots', () => {
    const errors = validateCartSlots([
      { type: 'open' },
      { type: 'mc' },
      { type: 'game' },
    ]);
    expect(errors.some((e) => e.includes('gameId'))).toBe(true);
  });

  it('preset ordering uses four items by default', () => {
    const ordering = QUIZ_PACKAGE_PRESET_SLOTS.find((s) => s.type === 'ordering');
    expect(ordering?.orderingItemCount).toBe(AI_SHOP_ORDERING_DEFAULT_ITEMS);
  });

  it('cartSlotsFromCounts applies per-type themes and ordering item count', () => {
    const slots = cartSlotsFromCounts({
      open: 1,
      mc: 0,
      ordering: 1,
      games: [],
      themes: { open: 'Sport', ordering: 'Historie' },
      orderingItemCount: AI_SHOP_ORDERING_MIN_ITEMS,
    });
    expect(slots).toHaveLength(2);
    expect(slots[0]).toMatchObject({ type: 'open', topic: 'Sport' });
    expect(slots[1]).toMatchObject({
      type: 'ordering',
      topic: 'Historie',
      orderingItemCount: AI_SHOP_ORDERING_MIN_ITEMS,
    });
  });

  it('clampOrderingItemCount enforces 2–5', () => {
    expect(clampOrderingItemCount(1)).toBe(2);
    expect(clampOrderingItemCount(4)).toBe(4);
    expect(clampOrderingItemCount(9)).toBe(5);
  });
});
