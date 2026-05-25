import { computeLeaderboardFromScores, type LeaderboardEntry, type RoomState } from '@quiz-tool/shared';

export function computeLeaderboard(room: RoomState): LeaderboardEntry[] {
  return computeLeaderboardFromScores(room.teams, room.scores);
}
