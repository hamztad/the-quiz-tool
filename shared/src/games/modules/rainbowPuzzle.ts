import type {
  GameResult,
  GameSubmission,
  RainbowPuzzleColor,
  RainbowPuzzleConfig,
  RainbowPuzzleSubmissionPayload,
} from '../types.js';
import { rankGameEntries } from '../ranking.js';
import { quizPointsForRank } from '../scoring.js';

export const RAINBOW_PUZZLE_GRID_SIZE = 5;
export const RAINBOW_PUZZLE_COLORS: RainbowPuzzleColor[] = [
  'red',
  'blue',
  'yellow',
  'orange',
  'pink',
  'green',
  'black',
  'white',
];

export function createDefaultRainbowPuzzleConfig(): RainbowPuzzleConfig {
  return {
    gameId: 'rainbowPuzzle',
    title: 'Rainbow Puzzle',
    instructions: 'Klikk farger for å spre dem. Fullfør brettet med høyest mulig poengsum.',
    gridSize: RAINBOW_PUZZLE_GRID_SIZE,
    colors: RAINBOW_PUZZLE_COLORS,
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

export function isRainbowPuzzleSubmissionPayload(
  payload: unknown,
): payload is RainbowPuzzleSubmissionPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return record.gameId === 'rainbowPuzzle' && typeof record.score === 'number';
}

export function buildRainbowPuzzleResults(
  questionId: string,
  maxPoints: number,
  config: RainbowPuzzleConfig,
  submissions: GameSubmission[],
): GameResult[] {
  const bestByTeam = new Map<string, { teamId: string; rankValue: number }>();

  for (const submission of submissions) {
    if (!isRainbowPuzzleSubmissionPayload(submission.payload)) continue;
    const rankValue = Math.max(0, Math.floor(submission.payload.score));
    const current = bestByTeam.get(submission.teamId);
    if (!current || rankValue > current.rankValue) {
      bestByTeam.set(submission.teamId, { teamId: submission.teamId, rankValue });
    }
  }

  const ranked = rankGameEntries(Array.from(bestByTeam.values()), config.rankingMode);

  return ranked.map((entry) => ({
    questionId,
    teamId: entry.teamId,
    gameId: 'rainbowPuzzle',
    rankValue: entry.rankValue,
    displayValue: `${entry.rankValue} poeng`,
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
