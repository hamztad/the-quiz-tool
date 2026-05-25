import { describe, expect, it } from 'vitest';
import { ownAnswerQuestionIds, ownAwardedPeerGrades, ownScoreEntries } from './teamReviewSelectors.js';

describe('team review selectors', () => {
  it('selects only this team own answers', () => {
    expect(
      ownAnswerQuestionIds(
        [
          { teamId: 'team-a', questionId: 'q-a' },
          { teamId: 'team-b', questionId: 'q-b' },
        ],
        'team-a',
      ),
    ).toEqual(['q-a']);
  });

  it('uses points awarded to this team, not points this team gave to others', () => {
    const peerGrades = [
      { graderTeamId: 'team-a', targetTeamId: 'team-b', questionId: 'q-1', points: 0 },
      { graderTeamId: 'team-c', targetTeamId: 'team-a', questionId: 'q-1', points: 1 },
    ];

    expect(ownAwardedPeerGrades(peerGrades, 'team-a')).toEqual([
      { graderTeamId: 'team-c', targetTeamId: 'team-a', questionId: 'q-1', points: 1 },
    ]);
  });

  it('selects only score entries awarded to this team', () => {
    expect(
      ownScoreEntries(
        [
          { teamId: 'team-a', questionId: 'q-1', points: 2, source: 'peer' },
          { teamId: 'team-b', questionId: 'q-1', points: 0, source: 'peer' },
        ],
        'team-a',
      ),
    ).toEqual([{ teamId: 'team-a', questionId: 'q-1', points: 2, source: 'peer' }]);
  });
});
