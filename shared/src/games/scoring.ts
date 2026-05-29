import { clampQuizPointsPerQuestion } from '../scoring/quizScoring.js';
import type { QuizScoringMode, ScoreEntry } from '../types/room.js';
import type { GamePointBand, GamePointMode, GameResult } from './types.js';

export function quizPointsForRank(
  rank: number,
  maxPoints: number,
  pointMode: GamePointMode,
  pointBands: GamePointBand[] = [],
): number {
  if (pointMode === 'winnerTakesAll') {
    return rank === 1 ? clampQuizPointsPerQuestion(maxPoints) : 0;
  }

  if (pointMode === 'rankedBands') {
    const points = pointBands.find((band) => band.rank === rank)?.points ?? 0;
    return clampQuizPointsPerQuestion(points);
  }

  return 0;
}

export function gameResultsToScoreEntries(
  results: GameResult[],
  scoringMode: QuizScoringMode = 'ranking',
): ScoreEntry[] {
  if (scoringMode === 'performance') {
    return results
      .filter((result) => result.status === 'ranked' || result.status === 'invalid')
      .map((result) => ({
        teamId: result.teamId,
        questionId: result.questionId,
        points: 0,
        performancePoints: result.performancePoints ?? 0,
        rawResultSummary: result.rawResultLabel,
        source: 'game' as const,
      }));
  }
  return results
    .filter((result) => result.status === 'ranked')
    .map((result) => ({
      teamId: result.teamId,
      questionId: result.questionId,
      points: result.quizPoints,
      source: 'game' as const,
    }));
}
