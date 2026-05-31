import { describe, expect, it } from 'vitest';
import { createSeededRandom } from './aiQuizVariety.js';
import {
  AI_SHOP_INSTANT_QUESTION_COUNT,
  buildInstantSlots,
  pickInstantTopic,
} from './aiShopInstantPlan.js';

describe('aiShopInstantPlan', () => {
  it('buildInstantSlots returns exactly 10 slots', () => {
    const slots = buildInstantSlots(createSeededRandom('seed-a'));
    expect(slots).toHaveLength(AI_SHOP_INSTANT_QUESTION_COUNT);
    expect(slots.filter((s) => s.type === 'open')).toHaveLength(3);
    expect(slots.filter((s) => s.type === 'mc')).toHaveLength(3);
    expect(slots.filter((s) => s.type === 'ordering')).toHaveLength(1);
    expect(slots.filter((s) => s.type === 'game')).toHaveLength(3);
  });

  it('never picks revealImage for instant games', () => {
    for (let i = 0; i < 20; i++) {
      const slots = buildInstantSlots(createSeededRandom(`seed-${i}`));
      for (const slot of slots) {
        if (slot.type === 'game') {
          expect(slot.gameId).not.toBe('revealImage');
        }
      }
    }
  });

  it('pickInstantTopic returns a preset', () => {
    const topic = pickInstantTopic(createSeededRandom('topic'));
    expect(topic.length).toBeGreaterThan(0);
  });
});
