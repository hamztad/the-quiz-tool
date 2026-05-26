import { describe, expect, it } from 'vitest';
import {
  buildFinalLeaderboardSnapshot,
  computeLeaderboardFromScores,
  getOfficialLeaderboard,
  getTeamFinalPlacement,
} from './leaderboardSelectors.js';

describe('computeLeaderboardFromScores', () => {
  const teams = [
    { id: 'team-a', name: 'Team A' },
    { id: 'team-b', name: 'Team B' },
    { id: 'team-c', name: 'Team C' },
  ];

  it('ranks multiple teams by total score', () => {
    expect(
      computeLeaderboardFromScores(teams, [
        { teamId: 'team-a', points: 2 },
        { teamId: 'team-b', points: 5 },
        { teamId: 'team-c', points: 1 },
      ]),
    ).toEqual([
      { teamId: 'team-b', teamName: 'Team B', totalPoints: 5 },
      { teamId: 'team-a', teamName: 'Team A', totalPoints: 2 },
      { teamId: 'team-c', teamName: 'Team C', totalPoints: 1 },
    ]);
  });

  it('can compute public leaderboard without answer data', () => {
    const entries = computeLeaderboardFromScores(teams, [{ teamId: 'team-a', points: 3 }]);
    expect(entries).toContainEqual({ teamId: 'team-a', teamName: 'Team A', totalPoints: 3 });
    expect(entries).toContainEqual({ teamId: 'team-b', teamName: 'Team B', totalPoints: 0 });
  });

  it('freezes final leaderboard snapshot even if later scores change', () => {
    const snapshot = buildFinalLeaderboardSnapshot(
      teams,
      [
        { teamId: 'team-a', points: 2 },
        { teamId: 'team-b', points: 5 },
      ],
      1234,
    );
    const room = {
      teams,
      scores: [
        { teamId: 'team-a', questionId: 'q2', points: 10, source: 'override' as const },
        { teamId: 'team-b', questionId: 'q2', points: 0, source: 'override' as const },
      ],
      settings: {
        showLeaderboard: true,
        teamReviewOpen: false,
        answerKeyOpen: false,
        allowNewTeams: false,
        finalResultLocked: true,
      },
      finalLeaderboardSnapshot: snapshot,
    };

    expect(getOfficialLeaderboard(room)[0]).toMatchObject({ teamId: 'team-b', totalPoints: 5 });
    expect(getTeamFinalPlacement(room, 'team-b')).toMatchObject({
      placement: 1,
      entry: { teamId: 'team-b', totalPoints: 5 },
    });
  });

  it('uses live scores before final result is locked', () => {
    const room = {
      teams,
      scores: [{ teamId: 'team-a', questionId: 'q1', points: 4, source: 'auto' as const }],
      settings: {
        showLeaderboard: true,
        teamReviewOpen: false,
        answerKeyOpen: false,
        allowNewTeams: true,
        finalResultLocked: false,
      },
      finalLeaderboardSnapshot: buildFinalLeaderboardSnapshot(teams, [{ teamId: 'team-b', points: 9 }]),
    };

    expect(getOfficialLeaderboard(room)[0]).toMatchObject({ teamId: 'team-a', totalPoints: 4 });
    expect(getTeamFinalPlacement(room, 'team-b')).toBeNull();
  });
});
