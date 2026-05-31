import { describe, expect, it } from 'vitest';
import { buildAiGeneratePrompt, buildAiShopSlotsBlock } from './buildAiGeneratePrompt.js';
import { buildInstantSlots } from './aiShopInstantPlan.js';
import { QUIZ_PACKAGE_PRESET_SLOTS } from './aiShopCart.js';
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
