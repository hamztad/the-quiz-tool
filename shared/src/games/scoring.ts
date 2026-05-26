import type { ScoreEntry } from '../types/room.js';
import type { GamePointBand, GamePointMode, GameResult } from './types.js';

export function quizPointsForRank(
  rank: number,
  maxPoints: number,
  pointMode: GamePointMode,
  pointBands: GamePointBand[] = [],
): number {
  if (pointMode === 'winnerTakesAll') {
    return rank === 1 ? maxPoints : 0;
  }

  if (pointMode === 'rankedBands') {
    return pointBands.find((band) => band.rank === rank)?.points ?? 0;
  }

  return 0;
}

export function gameResultsToScoreEntries(results: GameResult[]): ScoreEntry[] {
  return results
    .filter((result) => result.status === 'ranked')
    .map((result) => ({
      teamId: result.teamId,
      questionId: result.questionId,
      points: result.quizPoints,
      source: 'game' as const,
    }));
}
