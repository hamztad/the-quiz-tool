import type { LeaderboardEntry, PublicRoomState } from '@quiz-tool/shared';
import { getOfficialLeaderboard } from '@quiz-tool/shared';

export function computeLeaderboard(room: PublicRoomState): LeaderboardEntry[] {
  if (room.leaderboard) {
    return room.leaderboard;
  }
  return getOfficialLeaderboard(room);
}
