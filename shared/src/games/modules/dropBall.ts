import type {
  DropBallBallKind,
  DropBallConfig,
  DropBallRoundResult,
  DropBallSubmissionPayload,
  GameResult,
  GameSubmission,
} from '../types.js';
import { rankGameEntries } from '../ranking.js';
import { quizPointsForRank } from '../scoring.js';

export const DROP_BALL_DEFAULT_ROUNDS = 3;
export const DROP_BALL_SLOT_SCORES = [0, 100, 200, 500, 200, 100, 0] as const;
export const DROP_BALL_BONUS_SLOT_INDEX = 3;
export const DROP_BALL_BONUS_MULTIPLIER = 3;
export const DROP_BALL_JACKPOT_BONUS = 1000;

export function createDefaultDropBallConfig(): DropBallConfig {
  return {
    gameId: 'dropBall',
    title: 'Drop Ball',
    instructions: 'Slipp ballen tre ganger. Høyeste totalscore vinner.',
    totalRounds: DROP_BALL_DEFAULT_ROUNDS,
    slotScores: [...DROP_BALL_SLOT_SCORES],
    bonusSlotIndex: DROP_BALL_BONUS_SLOT_INDEX,
    bonusMultiplier: DROP_BALL_BONUS_MULTIPLIER,
    jackpotBonus: DROP_BALL_JACKPOT_BONUS,
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
    Array.isArray(config.slotScores) &&
    config.slotScores.length === 7 &&
    config.slotScores.every((score) => Number.isFinite(score) && score >= 0) &&
    Number.isInteger(config.bonusSlotIndex) &&
    config.bonusSlotIndex >= 0 &&
    config.bonusSlotIndex < config.slotScores.length &&
    Number.isFinite(config.bonusMultiplier) &&
    config.bonusMultiplier >= 1 &&
    Number.isFinite(config.jackpotBonus) &&
    config.jackpotBonus >= 0 &&
    config.rankingMode === 'highest' &&
    config.resultKind === 'ranked' &&
    config.pointMode === 'rankedBands'
  );
}

export function calculateDropBallRoundScore(
  config: DropBallConfig,
  slotIndex: number,
  ballKind: DropBallBallKind,
): DropBallRoundResult {
  const safeSlotIndex = Math.max(0, Math.min(config.slotScores.length - 1, Math.round(slotIndex)));
  const baseScore = Math.max(0, Math.round(config.slotScores[safeSlotIndex] ?? 0));
  const multiplier = ballKind === 'bonus' ? Math.max(1, Math.round(config.bonusMultiplier)) : 1;
  const jackpotBonus =
    ballKind === 'bonus' && safeSlotIndex === config.bonusSlotIndex
      ? Math.max(0, Math.round(config.jackpotBonus))
      : 0;
  const score = baseScore * multiplier + jackpotBonus;

  return {
    roundIndex: 0,
    slotIndex: safeSlotIndex,
    ballKind,
    baseScore,
    multiplier,
    jackpotBonus,
    score,
    unlockedBonus: ballKind === 'normal' && safeSlotIndex === config.bonusSlotIndex,
  };
}

export function calculateDropBallMaxScore(config: DropBallConfig): number {
  const maxSlotScore = Math.max(...config.slotScores.map((score) => Math.max(0, Math.round(score))));
  const bonusSlotScore = Math.max(0, Math.round(config.slotScores[config.bonusSlotIndex] ?? maxSlotScore));
  const bonusScore = bonusSlotScore * Math.max(1, Math.round(config.bonusMultiplier)) +
    Math.max(0, Math.round(config.jackpotBonus));

  if (config.totalRounds <= 1) return maxSlotScore;

  // Best case: unlock once on a normal ball, use the bonusball automatically next round,
  // then continue with the best normal slot for any remaining drops.
  return maxSlotScore + bonusScore + Math.max(0, config.totalRounds - 2) * maxSlotScore;
}

export function clampDropBallScore(score: number, config: DropBallConfig): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(calculateDropBallMaxScore(config), Math.floor(score)));
}

export function formatDropBallScore(score: number): string {
  return `${score} poeng`;
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
