import { describe, expect, it } from 'vitest';
import { QUIZ_PACKAGE_PRESET_SLOTS, validateCartSlots } from './aiShopCart.js';

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
});
