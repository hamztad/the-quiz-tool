import { describe, expect, it } from 'vitest';
import { quizHasGameQuestions } from './quizComposition.js';

describe('quizHasGameQuestions', () => {
  it('returns true when a game question exists', () => {
    expect(
      quizHasGameQuestions([
        { type: 'open' },
        { type: 'game' },
      ]),
    ).toBe(true);
  });

  it('returns false for only open, mc and ordering', () => {
    expect(
      quizHasGameQuestions([
        { type: 'open' },
        { type: 'mc' },
        { type: 'ordering' },
      ]),
    ).toBe(false);
  });
});
