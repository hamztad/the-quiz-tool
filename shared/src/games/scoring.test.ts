import { describe, expect, it } from 'vitest';
import { quizPointsForRank } from './scoring.js';

describe('quizPointsForRank', () => {
  it('awards all points to rank one in winnerTakesAll mode', () => {
    expect(quizPointsForRank(1, 3, 'winnerTakesAll')).toBe(3);
    expect(quizPointsForRank(2, 3, 'winnerTakesAll')).toBe(0);
  });

  it('uses configured ranked bands', () => {
    expect(
      quizPointsForRank(2, 5, 'rankedBands', [
        { rank: 1, points: 5 },
        { rank: 2, points: 3 },
      ]),
    ).toBe(3);
  });
});
