import type { LeaderboardEntry, ScoreEntry, Team } from '../types/room.js';

export function computeLeaderboardFromScores(
  teams: Team[],
  scores: Pick<ScoreEntry, 'teamId' | 'points'>[],
): LeaderboardEntry[] {
  const totals = new Map<string, number>();
  for (const team of teams) {
    totals.set(team.id, 0);
  }
  for (const score of scores) {
    totals.set(score.teamId, (totals.get(score.teamId) ?? 0) + score.points);
  }
  return teams
    .map((team) => ({
      teamId: team.id,
      teamName: team.name,
      totalPoints: totals.get(team.id) ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}
