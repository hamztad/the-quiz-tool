import { describe, expect, it } from 'vitest';
import { buildAiGeneratePrompt, buildAiShopSlotsBlock } from './buildAiGeneratePrompt.js';
import { buildInstantSlots } from './aiShopInstantPlan.js';
import { cartSlotsFromCounts, QUIZ_PACKAGE_PRESET_SLOTS } from './aiShopCart.js';
import { validateAiShopSlots } from './parseAiQuizJson.js';

const base = {
  roomId: 'r1',
  topic: 'Sport',
  questionCount: 10,
  difficulty: 'medium' as const,
};

describe('buildAiGeneratePrompt', () => {
  it('instant mode lists 10 slots', () => {
    const prompt = buildAiGeneratePrompt({ ...base, mode: 'instant' });
    expect(prompt).toContain('nøyaktig 10 oppgaver');
    expect(prompt).toContain('automatisk miks');
    expect(prompt).toContain('type "open"');
    expect(prompt).toContain('type "ordering"');
  });

  it('cart mode lists custom slots', () => {
    const slots = QUIZ_PACKAGE_PRESET_SLOTS;
    const prompt = buildAiGeneratePrompt({
      ...base,
      mode: 'cart',
      questionCount: 5,
      slots,
    });
    expect(prompt).toContain('nøyaktig 5 oppgaver');
    expect(prompt).toContain('valgt kurv');
    expect(prompt).toContain('gameId "emojiHunt"');
    expect(prompt).toContain('nøyaktig 4 items');
  });

  it('cart mode includes per-slot topics in slot list', () => {
    const slots = cartSlotsFromCounts({
      open: 1,
      mc: 1,
      ordering: 0,
      games: [],
      themes: { open: 'Geografi', mc: 'Film' },
    });
    const prompt = buildAiGeneratePrompt({
      ...base,
      mode: 'cart',
      questionCount: 2,
      slots,
    });
    expect(prompt).toContain('tema: «Geografi»');
    expect(prompt).toContain('tema: «Film»');
    expect(prompt).toContain('eget tema');
  });
});

describe('buildAiShopSlotsBlock', () => {
  it('matches instant slot count', () => {
    const block = buildAiShopSlotsBlock(buildInstantSlots());
    expect(block).toContain('nøyaktig 10 oppgaver');
  });
});

describe('validateAiShopSlots', () => {
  it('accepts matching types', () => {
    const openQ = {
      type: 'open' as const,
      lines: [{ text: 'Q', style: 'title' as const }],
      acceptedAnswers: ['A'],
      maxPoints: 1,
    };
    expect(validateAiShopSlots([openQ], [{ type: 'open' }])).toEqual([]);
  });
});
