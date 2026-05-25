import { describe, expect, it } from 'vitest';
import { computeLeaderboardFromScores } from './leaderboardSelectors.js';

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
});
