import type { FinalLeaderboardSnapshot, LeaderboardEntry, RoomState, ScoreEntry, Team } from '../types/room.js';

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

export function buildFinalLeaderboardSnapshot(
  teams: Team[],
  scores: Pick<ScoreEntry, 'teamId' | 'points'>[],
  lockedAt = Date.now(),
): FinalLeaderboardSnapshot {
  return {
    lockedAt,
    entries: computeLeaderboardFromScores(teams, scores),
  };
}

export function getOfficialLeaderboard(room: Pick<RoomState, 'teams' | 'scores' | 'settings' | 'finalLeaderboardSnapshot'>): LeaderboardEntry[] {
  if (room.settings.finalResultLocked && room.finalLeaderboardSnapshot) {
    return room.finalLeaderboardSnapshot.entries;
  }
  return computeLeaderboardFromScores(room.teams, room.scores);
}

export function getTeamFinalPlacement(
  room: Pick<RoomState, 'settings' | 'finalLeaderboardSnapshot'>,
  teamId: string,
): { placement: number; entry: LeaderboardEntry } | null {
  if (!room.settings.finalResultLocked || !room.finalLeaderboardSnapshot) return null;
  const index = room.finalLeaderboardSnapshot.entries.findIndex((entry) => entry.teamId === teamId);
  if (index < 0) return null;
  return { placement: index + 1, entry: room.finalLeaderboardSnapshot.entries[index] };
}
