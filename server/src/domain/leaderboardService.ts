import type { LeaderboardEntry, RoomState } from '@quiz-tool/shared';

export function computeLeaderboard(room: RoomState): LeaderboardEntry[] {
  const totals = new Map<string, number>();

  for (const team of room.teams) {
    totals.set(team.id, 0);
  }

  for (const score of room.scores) {
    totals.set(score.teamId, (totals.get(score.teamId) ?? 0) + score.points);
  }

  return room.teams
    .map((team) => ({
      teamId: team.id,
      teamName: team.name,
      totalPoints: totals.get(team.id) ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}
