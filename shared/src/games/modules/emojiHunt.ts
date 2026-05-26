import type {
  EmojiHuntConfig,
  EmojiHuntSubmissionPayload,
  GameResult,
  GameSubmission,
} from '../types.js';
import { rankGameEntries } from '../ranking.js';
import { quizPointsForRank } from '../scoring.js';

export const DEFAULT_EMOJI_HUNT_TARGET_COUNT = 3;
export const DEFAULT_EMOJI_HUNT_MAX_MS_PER_TARGET = 10_000;
export const EMOJI_HUNT_OPTION_COUNT = 20;

export function createDefaultEmojiHuntConfig(): EmojiHuntConfig {
  return {
    gameId: 'emojiHunt',
    title: 'Emoji-jakt',
    instructions: 'Finn emojiene i midten så raskt som mulig.',
    targetCount: DEFAULT_EMOJI_HUNT_TARGET_COUNT,
    maxMsPerTarget: DEFAULT_EMOJI_HUNT_MAX_MS_PER_TARGET,
    optionCount: EMOJI_HUNT_OPTION_COUNT,
    rankingMode: 'lowest',
    resultKind: 'ranked',
    pointMode: 'rankedBands',
    pointBands: [
      { rank: 1, points: 5 },
      { rank: 2, points: 3 },
      { rank: 3, points: 1 },
    ],
  };
}

export function isEmojiHuntSubmissionPayload(
  payload: unknown,
): payload is EmojiHuntSubmissionPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return record.gameId === 'emojiHunt' && typeof record.totalMs === 'number';
}

export function calculateEmojiHuntTotalMs(
  targetDurationsMs: number[],
  maxMsPerTarget = DEFAULT_EMOJI_HUNT_MAX_MS_PER_TARGET,
): number {
  return targetDurationsMs.reduce((sum, duration) => {
    const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : maxMsPerTarget;
    return sum + Math.min(Math.round(safeDuration), maxMsPerTarget);
  }, 0);
}

export function formatEmojiHuntMs(ms: number): string {
  return `${(ms / 1000).toFixed(2)} sekunder`;
}

export function buildEmojiHuntResults(
  questionId: string,
  maxPoints: number,
  config: EmojiHuntConfig,
  submissions: GameSubmission[],
): GameResult[] {
  const bestByTeam = new Map<string, { teamId: string; rankValue: number }>();

  for (const submission of submissions) {
    if (!isEmojiHuntSubmissionPayload(submission.payload)) continue;
    const rankValue = Math.max(0, Math.round(submission.payload.totalMs));
    const current = bestByTeam.get(submission.teamId);
    if (!current || rankValue < current.rankValue) {
      bestByTeam.set(submission.teamId, { teamId: submission.teamId, rankValue });
    }
  }

  const ranked = rankGameEntries(Array.from(bestByTeam.values()), config.rankingMode);

  return ranked.map((entry) => ({
    questionId,
    teamId: entry.teamId,
    gameId: 'emojiHunt',
    rankValue: entry.rankValue,
    displayValue: formatEmojiHuntMs(entry.rankValue),
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
