import type { GameQuestionConfig } from '../games/types.js';
import { validateAnagramAnswerText } from '../games/modules/anagram.js';
import { isValidDropBallConfig } from '../games/modules/dropBall.js';
import { validateMathExpressionConfig } from '../games/modules/mathExpression.js';
import { sanitizeRevealImageChoices } from '../games/modules/revealImage.js';
import { isMediaAttachment } from '../media/mediaAttachment.js';
import { isValidQuestionTimerConfig, normalizeQuestionTimerConfig } from '../timing/timerConfig.js';
import { validateOrderingQuestion } from '../ordering/orderingQuestion.js';
import type { Question, QuestionType } from '../types/room.js';
import { prepareQuizFileQuestionsForImport } from './quizFileImport.js';

export const QUIZ_FILE_FORMAT = 'the-quiz-tool-quiz' as const;
export const QUIZ_FILE_VERSION = 2 as const;
export const QUIZ_FILE_VERSION_LEGACY = 1 as const;
export const QUIZ_FILE_DEFAULT_NAME = 'the-quiz-tool-quiz.json';

export interface QuizFileExport {
  format: typeof QUIZ_FILE_FORMAT;
  version: typeof QUIZ_FILE_VERSION;
  title?: string;
  createdAt?: string;
  exportedAt: string;
  questions: Question[];
}

export interface QuizFileBuildOptions {
  title?: string;
  createdAt?: string;
  exportedAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isQuestionType(value: unknown): value is QuestionType {
  return value === 'open' || value === 'mc' || value === 'ordering' || value === 'game';
}

function isQuestionLine(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.text === 'string' &&
    (value.style === 'title' || value.style === 'body')
  );
}

function isMcOption(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.text === 'string' &&
    typeof value.isCorrect === 'boolean' &&
    (value.media === undefined || isMediaAttachment(value.media))
  );
}

function isOrderingItem(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.text === 'string' &&
    (value.media === undefined || isMediaAttachment(value.media))
  );
}

function isGameQuestionConfig(value: unknown): value is GameQuestionConfig {
  if (!isRecord(value)) return false;
  if (value.gameId === 'timerChallenge') {
    return (
      typeof value.targetMs === 'number' &&
      value.rankingMode === 'lowest' &&
      value.resultKind === 'ranked' &&
      (value.pointMode === 'winnerTakesAll' ||
        value.pointMode === 'rankedBands' ||
        value.pointMode === 'directScoreToPoints')
    );
  }
  if (value.gameId === 'rainbowPuzzle') {
    return (
      value.gridSize === 5 &&
      Array.isArray(value.colors) &&
      value.colors.length > 0 &&
      value.rankingMode === 'highest' &&
      value.resultKind === 'ranked' &&
      (value.pointMode === 'winnerTakesAll' ||
        value.pointMode === 'rankedBands' ||
        value.pointMode === 'directScoreToPoints')
    );
  }
  if (value.gameId === 'emojiHunt') {
    return (
      (value.targetCount === 2 ||
        value.targetCount === 3 ||
        value.targetCount === 4 ||
        value.targetCount === 5) &&
      typeof value.maxMsPerTarget === 'number' &&
      value.maxMsPerTarget > 0 &&
      value.optionCount === 20 &&
      value.rankingMode === 'lowest' &&
      value.resultKind === 'ranked' &&
      (value.pointMode === 'winnerTakesAll' ||
        value.pointMode === 'rankedBands' ||
        value.pointMode === 'directScoreToPoints')
    );
  }
  if (value.gameId === 'dropBall') {
    return isValidDropBallConfig(
      value as unknown as GameQuestionConfig & { gameId: 'dropBall' },
    );
  }
  if (value.gameId === 'anagram') {
    return (
      value.mode === 'classic' &&
      value.shuffleMode === 'perWord' &&
      typeof value.answerText === 'string' &&
      typeof value.scrambledText === 'string' &&
      value.scrambledText.trim().length > 0 &&
      validateAnagramAnswerText(value.answerText).ok &&
      value.rankingMode === 'highest' &&
      value.resultKind === 'directScore' &&
      value.pointMode === 'directScoreToPoints'
    );
  }
  if (value.gameId === 'mathExpression') {
    return validateMathExpressionConfig(
      value as unknown as GameQuestionConfig & { gameId: 'mathExpression' },
    ).ok;
  }
  if (value.gameId === 'revealImage') {
    return (
      (value.gridSize === 4 || value.gridSize === 5 || value.gridSize === 6) &&
      typeof value.correctAnswer === 'string' &&
      value.correctAnswer.trim().length > 0 &&
      Array.isArray(value.acceptedAnswers) &&
      value.acceptedAnswers.every((answer) => typeof answer === 'string') &&
      typeof value.choiceMultiplier === 'number' &&
      typeof value.minCorrectScore === 'number' &&
      value.rankingMode === 'highest' &&
      value.resultKind === 'ranked' &&
      value.pointMode === 'rankedBands' &&
      (value.choices === undefined ||
        sanitizeRevealImageChoices(value.choices as { id: string; text: string; isCorrect: boolean }[]) !==
          undefined)
    );
  }
  return false;
}

function isQuestion(value: unknown): value is Question {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.order !== 'number') return false;
  if (!isQuestionType(value.type)) return false;
  if (!Array.isArray(value.lines) || !value.lines.every(isQuestionLine)) return false;
  if (typeof value.maxPoints !== 'number') return false;
  if (value.imageOnlyOptions !== undefined && typeof value.imageOnlyOptions !== 'boolean') {
    return false;
  }
  if (value.timer !== undefined && !isValidQuestionTimerConfig(value.timer)) return false;
  if (value.decorEmoji !== undefined && typeof value.decorEmoji !== 'string') return false;
  if (value.type !== 'game' && value.game !== undefined) return false;
  if (value.type !== 'game' && value.gameType !== undefined) return false;

  if (
    value.media !== undefined &&
    (!Array.isArray(value.media) || !value.media.every(isMediaAttachment))
  ) {
    return false;
  }

  if (value.type === 'open') {
    if (value.orderingItems !== undefined || value.orderingCorrectOrder !== undefined) return false;
    if (value.options !== undefined) return false;
    if (
      value.acceptedAnswers !== undefined &&
      (!Array.isArray(value.acceptedAnswers) ||
        !value.acceptedAnswers.every((a) => typeof a === 'string'))
    ) {
      return false;
    }
    return true;
  }

  if (value.type === 'game') {
    if (
      value.options !== undefined ||
      value.acceptedAnswers !== undefined ||
      value.orderingItems !== undefined ||
      value.orderingCorrectOrder !== undefined
    ) {
      return false;
    }
    if (
      value.gameType !== undefined &&
      (!isRecord(value.game) || value.gameType !== value.game.gameId)
    ) {
      return false;
    }
    return isGameQuestionConfig(value.game);
  }

  if (value.type === 'ordering') {
    if (value.options !== undefined || value.acceptedAnswers !== undefined) return false;
    if (!Array.isArray(value.orderingItems) || !value.orderingItems.every(isOrderingItem)) return false;
    if (
      !Array.isArray(value.orderingCorrectOrder) ||
      !value.orderingCorrectOrder.every((id) => typeof id === 'string')
    ) {
      return false;
    }
    if (value.orderingDirectionTop !== undefined && typeof value.orderingDirectionTop !== 'string') return false;
    if (value.orderingDirectionBottom !== undefined && typeof value.orderingDirectionBottom !== 'string') return false;
    return validateOrderingQuestion({
      orderingItems: value.orderingItems,
      orderingCorrectOrder: value.orderingCorrectOrder,
      imageOnlyOptions: value.imageOnlyOptions === true ? true : undefined,
    } as Pick<Question, 'orderingItems' | 'orderingCorrectOrder' | 'imageOnlyOptions'>).length === 0;
  }

  if (value.orderingItems !== undefined || value.orderingCorrectOrder !== undefined) return false;
  if (
    !Array.isArray(value.options) ||
    value.options.length === 0 ||
    !value.options.every(isMcOption)
  ) {
    return false;
  }
  return true;
}

export function buildQuizFileExport(
  questions: Question[],
  options: QuizFileBuildOptions = {},
): QuizFileExport {
  return {
    format: QUIZ_FILE_FORMAT,
    version: QUIZ_FILE_VERSION,
    ...(options.title ? { title: options.title } : {}),
    ...(options.createdAt ? { createdAt: options.createdAt } : {}),
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    questions: questions.map((q, i) => ({ ...q, order: i })),
  };
}

/** @internal Exported for import regression tests */
export function isQuizFileQuestion(value: unknown): value is Question {
  return isQuestion(value);
}

export function parseQuizFile(raw: unknown): { ok: true; data: QuizFileExport } | { ok: false; error: string } {
  if (!isRecord(raw)) {
    return { ok: false, error: 'Filen er ikke gyldig JSON.' };
  }

  if (raw.format !== QUIZ_FILE_FORMAT) {
    return { ok: false, error: 'Filen ser ikke ut som en Quiz Tool-eksport.' };
  }

  if (raw.version !== QUIZ_FILE_VERSION && raw.version !== QUIZ_FILE_VERSION_LEGACY) {
    return { ok: false, error: 'Ustøttet versjon av quizfilen.' };
  }

  if (!Array.isArray(raw.questions)) {
    return { ok: false, error: 'Quizfilen mangler spørsmål.' };
  }

  if (raw.questions.length === 0) {
    return { ok: false, error: 'Quizfilen inneholder ingen spørsmål.' };
  }

  const preparedQuestions = prepareQuizFileQuestionsForImport(raw.questions);
  const invalidIndex = preparedQuestions.findIndex((question) => !isQuestion(question));
  if (invalidIndex >= 0) {
    return {
      ok: false,
      error: `Spørsmål ${invalidIndex + 1} i quizfilen er ugyldig eller ufullstendig.`,
    };
  }

  if (raw.title !== undefined && typeof raw.title !== 'string') {
    return { ok: false, error: 'Quizfilen har ugyldig tittel.' };
  }

  if (raw.createdAt !== undefined && typeof raw.createdAt !== 'string') {
    return { ok: false, error: 'Quizfilen har ugyldig opprettelsesdato.' };
  }

  if (typeof raw.exportedAt !== 'string') {
    return { ok: false, error: 'Quizfilen mangler eksportdato.' };
  }

  return {
    ok: true,
    data: {
      format: QUIZ_FILE_FORMAT,
      version: QUIZ_FILE_VERSION,
      ...(typeof raw.title === 'string' ? { title: raw.title } : {}),
      ...(typeof raw.createdAt === 'string' ? { createdAt: raw.createdAt } : {}),
      exportedAt: raw.exportedAt,
      questions: (preparedQuestions as Question[]).map((q, i) => ({
        ...q,
        order: i,
        timer: normalizeQuestionTimerConfig(q.timer),
      })),
    },
  };
}
