import type {
  DropBallConfig,
  DropBallRoundResult,
  DropBallSubmissionPayload,
  GameResult,
  GameSubmission,
} from '../types.js';
import { rankGameEntries } from '../ranking.js';
import { quizPointsForRank } from '../scoring.js';

export const DROP_BALL_DEFAULT_ROUNDS = 3;
export const DROP_BALL_OBSTACLE_COUNT = 14;
export const DROP_BALL_COIN_VALUES = [1000, 2000, 3000] as const;
export const DROP_BALL_MAX_AIR_TIME_MS = 30_000;
export const DROP_BALL_ALL_COINS_BONUS = 5000;
export const DROP_BALL_ALL_OBSTACLES_BONUS = 10_000;
export const DROP_BALL_PERFECT_BOARD_BONUS = 25_000;

export function createDefaultDropBallConfig(): DropBallConfig {
  return {
    gameId: 'dropBall',
    title: 'Drop Ball',
    instructions: 'Slipp ballen tre ganger. Fjern hindre, samle 1k/2k/3k-mynter og få hattrick-bonus for alle tre.',
    totalRounds: DROP_BALL_DEFAULT_ROUNDS,
    obstacleCount: DROP_BALL_OBSTACLE_COUNT,
    coinValues: [...DROP_BALL_COIN_VALUES],
    maxAirTimeMs: DROP_BALL_MAX_AIR_TIME_MS,
    allCoinsBonus: DROP_BALL_ALL_COINS_BONUS,
    allObstaclesBonus: DROP_BALL_ALL_OBSTACLES_BONUS,
    perfectBoardBonus: DROP_BALL_PERFECT_BOARD_BONUS,
    rankingMode: 'highest',
    resultKind: 'ranked',
    pointMode: 'rankedBands',
    pointBands: [
      { rank: 1, points: 5 },
      { rank: 2, points: 3 },
      { rank: 3, points: 1 },
    ],
  };
}

export function isDropBallSubmissionPayload(
  payload: unknown,
): payload is DropBallSubmissionPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return record.gameId === 'dropBall' && typeof record.score === 'number';
}

export function isValidDropBallConfig(config: DropBallConfig): boolean {
  return (
    config.gameId === 'dropBall' &&
    (config.totalRounds === 1 || config.totalRounds === 2 || config.totalRounds === 3) &&
    Number.isInteger(config.obstacleCount) &&
    config.obstacleCount >= 1 &&
    config.obstacleCount <= 30 &&
    Array.isArray(config.coinValues) &&
    config.coinValues.length > 0 &&
    config.coinValues.length <= 10 &&
    config.coinValues.every((score) => Number.isFinite(score) && score >= 0) &&
    Number.isFinite(config.maxAirTimeMs) &&
    config.maxAirTimeMs >= 1000 &&
    Number.isFinite(config.allCoinsBonus) &&
    config.allCoinsBonus >= 0 &&
    Number.isFinite(config.allObstaclesBonus) &&
    config.allObstaclesBonus >= 0 &&
    Number.isFinite(config.perfectBoardBonus) &&
    config.perfectBoardBonus >= 0 &&
    config.rankingMode === 'highest' &&
    config.resultKind === 'ranked' &&
    config.pointMode === 'rankedBands'
  );
}

export function calculateDropBallObstaclePoints(obstacleHits: number): number {
  const safeHits = Math.max(0, Math.floor(obstacleHits));
  return (safeHits * (safeHits + 1) * 100) / 2;
}

export function calculateDropBallBoardScore(
  config: DropBallConfig,
  airTimeMs: number,
  obstacleHits: number,
  coinValues: number[],
  roundIndex = 0,
): DropBallRoundResult {
  const safeAirTimeMs = Math.max(0, Math.min(config.maxAirTimeMs, Math.round(airTimeMs)));
  const safeObstacleHits = Math.max(0, Math.min(config.obstacleCount, Math.floor(obstacleHits)));
  const remainingCoinValues = [...config.coinValues];
  const safeCoinValues: number[] = [];
  for (const value of coinValues) {
    if (!Number.isFinite(value)) continue;
    const index = remainingCoinValues.indexOf(value);
    if (index === -1) continue;
    safeCoinValues.push(Math.max(0, Math.round(value)));
    remainingCoinValues.splice(index, 1);
  }
  const obstaclePoints = calculateDropBallObstaclePoints(safeObstacleHits);
  const coinPoints = safeCoinValues.reduce((sum, value) => sum + value, 0);
  const allCoinsBonus =
    safeCoinValues.length >= config.coinValues.length
      ? Math.max(0, Math.round(config.allCoinsBonus))
      : 0;
  const allObstaclesBonus =
    safeObstacleHits >= config.obstacleCount
      ? Math.max(0, Math.round(config.allObstaclesBonus))
      : 0;
  const perfectBoardBonus =
    allCoinsBonus > 0 && allObstaclesBonus > 0
      ? Math.max(0, Math.round(config.perfectBoardBonus))
      : 0;
  const score = safeAirTimeMs + obstaclePoints + coinPoints + allCoinsBonus + allObstaclesBonus + perfectBoardBonus;

  return {
    roundIndex,
    airTimeMs: safeAirTimeMs,
    obstacleHits: safeObstacleHits,
    coinValues: safeCoinValues,
    obstaclePoints,
    coinPoints,
    allCoinsBonus,
    allObstaclesBonus,
    perfectBoardBonus,
    score,
  };
}

export function calculateDropBallMaxBoardScore(config: DropBallConfig): number {
  return calculateDropBallBoardScore(
    config,
    config.maxAirTimeMs,
    config.obstacleCount,
    config.coinValues,
  ).score;
}

export function calculateDropBallMaxScore(config: DropBallConfig): number {
  return calculateDropBallMaxBoardScore(config) * config.totalRounds;
}

export function clampDropBallScore(score: number, config: DropBallConfig): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(calculateDropBallMaxScore(config), Math.floor(score)));
}

export function sanitizeDropBallRounds(
  rounds: DropBallRoundResult[] | undefined,
  config: DropBallConfig,
): DropBallRoundResult[] {
  if (!Array.isArray(rounds)) return [];
  return rounds.slice(0, config.totalRounds).map((round, index) =>
    calculateDropBallBoardScore(
      config,
      round.airTimeMs,
      round.obstacleHits,
      round.coinValues,
      index,
    ),
  );
}

export function formatDropBallScore(score: number): string {
  return `${Math.round(score).toLocaleString('nb-NO')} poeng`;
}

export function buildDropBallResults(
  questionId: string,
  maxPoints: number,
  config: DropBallConfig,
  submissions: GameSubmission[],
): GameResult[] {
  const bestByTeam = new Map<string, { teamId: string; rankValue: number }>();

  for (const submission of submissions) {
    if (!isDropBallSubmissionPayload(submission.payload)) continue;
    const rankValue = clampDropBallScore(submission.payload.score, config);
    const current = bestByTeam.get(submission.teamId);
    if (!current || rankValue > current.rankValue) {
      bestByTeam.set(submission.teamId, { teamId: submission.teamId, rankValue });
    }
  }

  const ranked = rankGameEntries(Array.from(bestByTeam.values()), config.rankingMode);

  return ranked.map((entry) => ({
    questionId,
    teamId: entry.teamId,
    gameId: 'dropBall',
    rankValue: entry.rankValue,
    displayValue: formatDropBallScore(entry.rankValue),
    rank: entry.rank,
    quizPoints: quizPointsForRank(
      entry.rank,
      maxPoints,
      config.pointMode,
      config.pointBands,
    ),
    status: 'ranked',
  }));
}
