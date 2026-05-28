import type { GamePointBand, RevealImageConfig } from '../games/types.js';
import type { Question } from '../types/room.js';

/** Maks quiz-poeng en enkelt oppgave kan gi (uavhengig av spillintern score). */
export const QUIZ_MAX_POINTS_PER_QUESTION = 10;

export const DEFAULT_RANKED_POINT_BANDS: GamePointBand[] = [
  { rank: 1, points: 5 },
  { rank: 2, points: 3 },
  { rank: 3, points: 1 },
];

export function clampQuizPointsPerQuestion(points: number): number {
  if (!Number.isFinite(points)) return 0;
  return Math.max(0, Math.min(QUIZ_MAX_POINTS_PER_QUESTION, Math.round(points)));
}

export function clampQuestionMaxPoints(maxPoints: number): number {
  if (!Number.isFinite(maxPoints)) return 0;
  return Math.max(0, Math.min(QUIZ_MAX_POINTS_PER_QUESTION, Math.round(maxPoints)));
}

export function normalizeRankedPointBands(
  bands: GamePointBand[] | undefined,
): GamePointBand[] {
  const source =
    bands && bands.length > 0
      ? bands
      : DEFAULT_RANKED_POINT_BANDS;
  return source.map((band) => ({
    rank: band.rank,
    points: clampQuizPointsPerQuestion(band.points),
  }));
}

function isLegacyRevealImageConfig(game: RevealImageConfig): boolean {
  const record = game as unknown as { pointMode?: string; resultKind?: string };
  return (
    record.pointMode === 'directScoreToPoints' || record.resultKind === 'directScore'
  );
}

function migrateRevealImageGame(game: RevealImageConfig): RevealImageConfig {
  const legacyDirect = isLegacyRevealImageConfig(game);

  if (!legacyDirect && game.pointMode === 'rankedBands') {
    return {
      ...game,
      pointBands: normalizeRankedPointBands(game.pointBands),
    };
  }

  return {
    ...game,
    resultKind: 'ranked',
    pointMode: 'rankedBands',
    pointBands: normalizeRankedPointBands(
      legacyDirect ? undefined : game.pointBands,
    ),
  };
}

/** Normaliser poeng på ett spørsmål (import, lagring, legacy-quizer). */
export function normalizeQuestionScoring(question: Question): Question {
  let next: Question = {
    ...question,
    maxPoints: clampQuestionMaxPoints(question.maxPoints),
  };

  if (next.type === 'game' && next.game) {
    const game =
      next.game.gameId === 'revealImage'
        ? migrateRevealImageGame(next.game)
        : next.game;

    if (game.pointMode === 'rankedBands' && game.pointBands) {
      next = {
        ...next,
        game: {
          ...game,
          pointBands: normalizeRankedPointBands(game.pointBands),
        },
      };
    } else {
      next = { ...next, game };
    }

    const gameConfig = next.game;
    if (gameConfig?.pointMode === 'rankedBands') {
      const firstPlace =
        gameConfig.pointBands?.find((b) => b.rank === 1)?.points ??
        DEFAULT_RANKED_POINT_BANDS[0]!.points;
      if (next.maxPoints !== firstPlace) {
        next = { ...next, maxPoints: clampQuestionMaxPoints(firstPlace) };
      }
    }
  }

  return next;
}

export function normalizeQuestionsScoring(questions: Question[]): Question[] {
  return questions.map(normalizeQuestionScoring);
}
