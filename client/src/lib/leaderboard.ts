import type { LeaderboardEntry, PublicRoomState } from '@quiz-tool/shared';
import { computeTeamTotalPoints } from './teamScoreDisplay';

export function computeLeaderboard(room: PublicRoomState): LeaderboardEntry[] {
  if (room.leaderboard) {
    return room.leaderboard;
  }
  return room.teams
    .map((team) => ({
      teamId: team.id,
      teamName: team.name,
      totalPoints: computeTeamTotalPoints(room, team.id),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}
