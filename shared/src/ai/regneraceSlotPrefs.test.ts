import { describe, expect, it } from 'vitest';
import {
  buildRegneraceConfigFromSlotAndAi,
  parseRegneraceAnswerModeFromAi,
  parseRegneraceOperationsFromAi,
} from './regneraceSlotPrefs.js';
import type { AiShopSlot } from './aiQuizTypes.js';

describe('regneraceSlotPrefs', () => {
  it('uses user answerMode over AI', () => {
    const slot: AiShopSlot = {
      type: 'game',
      gameId: 'mathExpression',
      regnerace: { answerMode: 'multipleChoice' },
    };
    const game = buildRegneraceConfigFromSlotAndAi(slot, { regneraceAnswerMode: 'input' });
    expect(game?.answerMode).toBe('multipleChoice');
  });

  it('uses AI answerMode when user did not choose', () => {
    const slot: AiShopSlot = { type: 'game', gameId: 'mathExpression' };
    const game = buildRegneraceConfigFromSlotAndAi(slot, { regneraceAnswerMode: 'input' });
    expect(game?.answerMode).toBe('input');
  });

  it('returns null without user or AI answerMode', () => {
    expect(buildRegneraceConfigFromSlotAndAi({ type: 'game', gameId: 'mathExpression' }, {})).toBeNull();
  });

  it('parses regneraceOperations from AI', () => {
    expect(
      parseRegneraceOperationsFromAi({ regneraceOperations: ['multiply', 'divide', 'bogus'] }),
    ).toEqual(['multiply', 'divide']);
  });

  it('parses nested regnerace block', () => {
    expect(
      parseRegneraceAnswerModeFromAi({ regnerace: { answerMode: 'multipleChoice' } }),
    ).toBe('multipleChoice');
  });
});
