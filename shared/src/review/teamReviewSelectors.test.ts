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

  it('keeps A/B/C circular grading separate from each team review', () => {
    const answers = [
      { teamId: 'team-a', questionId: 'q-a' },
      { teamId: 'team-b', questionId: 'q-b' },
      { teamId: 'team-c', questionId: 'q-c' },
    ];
    const peerGrades = [
      { graderTeamId: 'team-a', targetTeamId: 'team-b', questionId: 'q-b', points: 0 },
      { graderTeamId: 'team-b', targetTeamId: 'team-c', questionId: 'q-c', points: 1 },
      { graderTeamId: 'team-c', targetTeamId: 'team-a', questionId: 'q-a', points: 2 },
    ];

    expect(ownAnswerQuestionIds(answers, 'team-a')).toEqual(['q-a']);
    expect(ownAnswerQuestionIds(answers, 'team-a')).not.toContain('q-b');
    expect(ownAwardedPeerGrades(peerGrades, 'team-a')).toEqual([
      { graderTeamId: 'team-c', targetTeamId: 'team-a', questionId: 'q-a', points: 2 },
    ]);
    expect(ownAwardedPeerGrades(peerGrades, 'team-a')).not.toContainEqual(
      { graderTeamId: 'team-a', targetTeamId: 'team-b', questionId: 'q-b', points: 0 },
    );
  });
});
