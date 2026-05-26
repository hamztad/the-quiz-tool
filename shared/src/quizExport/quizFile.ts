import type { GameQuestionConfig } from '../games/types.js';
import type { Question, QuestionType } from '../types/room.js';

export const QUIZ_FILE_FORMAT = 'the-quiz-tool-quiz' as const;
export const QUIZ_FILE_VERSION = 1 as const;
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
  return value === 'open' || value === 'mc' || value === 'game';
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
    typeof value.isCorrect === 'boolean'
  );
}

function isMediaAttachment(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const validSource = value.source === undefined || value.source === 'pixabay';
  const validOptionalStrings =
    (value.alt === undefined || typeof value.alt === 'string') &&
    (value.previewUrl === undefined || typeof value.previewUrl === 'string') &&
    (value.photographer === undefined || typeof value.photographer === 'string') &&
    (value.pageUrl === undefined || typeof value.pageUrl === 'string');

  return (
    value.type === 'image' &&
    typeof value.url === 'string' &&
    value.url.length <= 2_000 &&
    validSource &&
    validOptionalStrings
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
  return false;
}

function isQuestion(value: unknown): value is Question {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.order !== 'number') return false;
  if (!isQuestionType(value.type)) return false;
  if (!Array.isArray(value.lines) || !value.lines.every(isQuestionLine)) return false;
  if (typeof value.maxPoints !== 'number') return false;
  if (value.type !== 'game' && value.game !== undefined) return false;

  if (
    value.media !== undefined &&
    (!Array.isArray(value.media) || !value.media.every(isMediaAttachment))
  ) {
    return false;
  }

  if (value.type === 'open') {
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
    if (value.options !== undefined || value.acceptedAnswers !== undefined) return false;
    return isGameQuestionConfig(value.game);
  }

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

export function parseQuizFile(raw: unknown): { ok: true; data: QuizFileExport } | { ok: false; error: string } {
  if (!isRecord(raw)) {
    return { ok: false, error: 'Filen er ikke gyldig JSON.' };
  }

  if (raw.format !== QUIZ_FILE_FORMAT) {
    return { ok: false, error: 'Filen ser ikke ut som en Quiz Tool-eksport.' };
  }

  if (raw.version !== QUIZ_FILE_VERSION) {
    return { ok: false, error: 'Ustøttet versjon av quizfilen.' };
  }

  if (!Array.isArray(raw.questions)) {
    return { ok: false, error: 'Quizfilen mangler spørsmål.' };
  }

  if (raw.questions.length === 0) {
    return { ok: false, error: 'Quizfilen inneholder ingen spørsmål.' };
  }

  if (!raw.questions.every(isQuestion)) {
    return { ok: false, error: 'Quizfilen inneholder ugyldige spørsmål.' };
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
      questions: raw.questions as Question[],
    },
  };
}
