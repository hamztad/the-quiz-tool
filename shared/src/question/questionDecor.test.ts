import { describe, expect, it } from 'vitest';
import {
  getAutoQuestionDecorEmoji,
  questionHasDecorImage,
  resolveQuestionDecorEmoji,
} from './questionDecor.js';
import { createDefaultMathRaceConfig } from '../games/modules/mathExpression.js';

describe('questionDecor', () => {
  it('detects question images', () => {
    expect(
      questionHasDecorImage({
        media: [{ type: 'image', url: 'https://example.com/a.jpg' }],
      }),
    ).toBe(true);
    expect(questionHasDecorImage({ media: undefined })).toBe(false);
  });

  it('returns auto emoji when no image and no custom choice', () => {
    expect(resolveQuestionDecorEmoji({ type: 'mc', media: undefined })).toBe('❓');
    expect(
      resolveQuestionDecorEmoji({
        type: 'game',
        media: undefined,
        game: { gameId: 'timerChallenge', targetMs: 5000, pointMode: 'rankedBands' },
      }),
    ).toBe('⏱️');
  });

  it('uses custom decorEmoji when set and no image', () => {
    expect(
      resolveQuestionDecorEmoji({
        type: 'open',
        media: undefined,
        decorEmoji: '🦊',
      }),
    ).toBe('🦊');
  });

  it('hides emoji when question has image', () => {
    expect(
      resolveQuestionDecorEmoji({
        type: 'open',
        decorEmoji: '🦊',
        media: [{ type: 'image', url: 'https://example.com/x.png' }],
      }),
    ).toBeNull();
  });

  it('uses race emoji for regnerace', () => {
    expect(
      getAutoQuestionDecorEmoji({
        type: 'game',
        game: { gameId: 'mathExpression', ...createDefaultMathRaceConfig() },
      }),
    ).toBe('🏃');
  });
});
