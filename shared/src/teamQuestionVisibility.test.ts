import { describe, expect, it } from 'vitest';
import type { Question } from './types/room.js';
import { isQuestionRevealedToTeam, redactQuestionForTeam } from './teamQuestionVisibility.js';

describe('isQuestionRevealedToTeam', () => {
  it('is false when never activated and locked', () => {
    expect(
      isQuestionRevealedToTeam(
        { questionStatus: { q1: 'locked' }, questionsActivated: { q1: false } },
        'q1',
      ),
    ).toBe(false);
  });

  it('is true when open', () => {
    expect(
      isQuestionRevealedToTeam(
        { questionStatus: { q1: 'open' }, questionsActivated: { q1: false } },
        'q1',
      ),
    ).toBe(true);
  });

  it('is true when locked but previously activated', () => {
    expect(
      isQuestionRevealedToTeam(
        { questionStatus: { q1: 'locked' }, questionsActivated: { q1: true } },
        'q1',
      ),
    ).toBe(true);
  });
});

describe('redactQuestionForTeam', () => {
  const question: Question = {
    id: 'q1',
    order: 0,
    type: 'open',
    lines: [{ text: 'Secret?', style: 'title' }],
    hint: 'tema',
    acceptedAnswers: ['Paris'],
    maxPoints: 1,
  };

  it('strips content when not revealed', () => {
    const redacted = redactQuestionForTeam(question, false);
    expect(redacted.lines).toHaveLength(0);
    expect(redacted.hint).toBeUndefined();
    expect(redacted.acceptedAnswers).toBeUndefined();
  });

  it('keeps content when revealed', () => {
    expect(redactQuestionForTeam(question, true)).toEqual(question);
  });

  it('strips game config when game question is not revealed', () => {
    const redacted = redactQuestionForTeam(
      {
        id: 'game-1',
        order: 0,
        type: 'game',
        lines: [{ text: 'Stop clock', style: 'title' }],
        game: {
          gameId: 'timerChallenge',
          targetMs: 10_000,
          rankingMode: 'lowest',
          resultKind: 'ranked',
          pointMode: 'winnerTakesAll',
        },
        maxPoints: 1,
      },
      false,
    );

    expect(redacted.lines).toHaveLength(0);
    expect(redacted.game).toBeUndefined();
  });

  it('strips ordering content when not revealed', () => {
    const redacted = redactQuestionForTeam(
      {
        id: 'ordering-1',
        order: 0,
        type: 'ordering',
        lines: [{ text: 'Sorter', style: 'title' }],
        orderingItems: [{ id: 'a', text: 'A' }],
        orderingCorrectOrder: ['a'],
        maxPoints: 2,
      },
      false,
    );

    expect(redacted.lines).toEqual([]);
    expect(redacted.orderingItems).toBeUndefined();
    expect(redacted.orderingCorrectOrder).toBeUndefined();
  });
});
