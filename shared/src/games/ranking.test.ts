import { describe, expect, it } from 'vitest';
import { rankGameEntries } from './ranking.js';

describe('rankGameEntries', () => {
  it('ranks highest values first', () => {
    expect(
      rankGameEntries(
        [
          { teamId: 'a', rankValue: 10 },
          { teamId: 'b', rankValue: 30 },
          { teamId: 'c', rankValue: 20 },
        ],
        'highest',
      ),
    ).toEqual([
      { teamId: 'b', rankValue: 30, rank: 1 },
      { teamId: 'c', rankValue: 20, rank: 2 },
      { teamId: 'a', rankValue: 10, rank: 3 },
    ]);
  });

  it('ranks lowest values first and shares ties', () => {
    expect(
      rankGameEntries(
        [
          { teamId: 'a', rankValue: 100 },
          { teamId: 'b', rankValue: 50 },
          { teamId: 'c', rankValue: 50 },
          { teamId: 'd', rankValue: 200 },
        ],
        'lowest',
      ),
    ).toEqual([
      { teamId: 'b', rankValue: 50, rank: 1 },
      { teamId: 'c', rankValue: 50, rank: 1 },
      { teamId: 'a', rankValue: 100, rank: 3 },
      { teamId: 'd', rankValue: 200, rank: 4 },
    ]);
  });
});
