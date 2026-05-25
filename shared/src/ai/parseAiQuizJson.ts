import { DEFAULT_MAX_POINTS } from '../constants/events.js';
import type { McOption, Question } from '../types/room.js';
import { validateQuestionsForSave } from '../import/parseQuizText.js';
import {
  AI_GENERATE_QUESTION_MAX,
  AI_GENERATE_QUESTION_MIN,
  type AiQuizQuestionStyle,
} from './aiQuizTypes.js';
import { shuffleAiGeneratedMcOptions } from './shuffleMcOptions.js';

const MAX_QUESTION_TEXT = 400;
const MAX_ANSWER_TEXT = 120;
const MAX_OPTION_TEXT = 120;
const MAX_HINT_TEXT = 200;

export type ParsedAiQuizQuestion = Omit<Question, 'id' | 'order'>;

export interface ParseAiQuizJsonResult {
  questions: ParsedAiQuizQuestion[];
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown, field: string, maxLen: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLen) return null;
  return trimmed;
}

function parseMcOptions(raw: unknown, questionIndex: number): McOption[] | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const options: McOption[] = [];
  let correctCount = 0;

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!isRecord(item)) return null;
    const text = asNonEmptyString(item.text, `options[${i}].text`, MAX_OPTION_TEXT);
    if (!text) return null;
    const correct = item.correct === true;
    if (correct) correctCount++;
    options.push({
      id: `ai-opt-${questionIndex}-${i}`,
      text,
      isCorrect: correct,
    });
  }

  if (correctCount !== 1) return null;
  return options;
}

function parseQuestion(raw: unknown, index: number): ParsedAiQuizQuestion | null {
  if (!isRecord(raw)) return null;
  const type = raw.type;
  const text = asNonEmptyString(raw.text, 'text', MAX_QUESTION_TEXT);
  if (!text) return null;
  const bodyRaw = raw.body;
  const bodyLines =
    typeof bodyRaw === 'string'
      ? [bodyRaw]
      : Array.isArray(bodyRaw)
        ? bodyRaw
        : [];
  const parsedBodyLines = bodyLines
    .map((line) => asNonEmptyString(line, 'body', MAX_QUESTION_TEXT))
    .filter((line): line is string => Boolean(line));
  const lines = [
    { text, style: 'title' as const },
    ...parsedBodyLines.map((line) => ({ text: line, style: 'body' as const })),
  ];

  if (type === 'open') {
    const answersRaw = raw.acceptedAnswers;
    if (!Array.isArray(answersRaw) || answersRaw.length === 0) return null;
    const acceptedAnswers: string[] = [];
    for (const a of answersRaw) {
      const answer = asNonEmptyString(a, 'acceptedAnswers', MAX_ANSWER_TEXT);
      if (!answer) return null;
      if (!acceptedAnswers.includes(answer)) acceptedAnswers.push(answer);
    }
    if (acceptedAnswers.length === 0) return null;

    const hint = raw.hint !== undefined
      ? asNonEmptyString(raw.hint, 'hint', MAX_HINT_TEXT) ?? undefined
      : undefined;

    return {
      type: 'open',
      lines,
      hint,
      acceptedAnswers,
      maxPoints: DEFAULT_MAX_POINTS,
    };
  }

  if (type === 'mc') {
    const options = parseMcOptions(raw.options, index);
    if (!options) return null;
    return {
      type: 'mc',
      lines,
      options,
      maxPoints: DEFAULT_MAX_POINTS,
    };
  }

  return null;
}

/** Ensures generated questions match the user's type selection. */
export function validateAiQuestionStyle(
  questions: ParsedAiQuizQuestion[],
  style: AiQuizQuestionStyle,
): string[] {
  if (style === 'open') {
    const mcCount = questions.filter((q) => q.type === 'mc').length;
    if (mcCount > 0) {
      return [`Forventet kun åpne spørsmål, men fikk ${mcCount} flervalg.`];
    }
    return [];
  }

  if (style === 'mc') {
    const openCount = questions.filter((q) => q.type === 'open').length;
    if (openCount > 0) {
      return [`Forventet kun flervalg, men fikk ${openCount} åpne spørsmål.`];
    }
    return [];
  }

  const openCount = questions.filter((q) => q.type === 'open').length;
  const mcCount = questions.filter((q) => q.type === 'mc').length;
  if (openCount === 0) {
    return ['Blandet krever minst ett åpent spørsmål.'];
  }
  if (mcCount === 0) {
    return ['Blandet krever minst ett flervalgsspørsmål.'];
  }
  return [];
}

/** Parse and validate strict JSON from the AI model. */
export function parseAiQuizJson(
  raw: string,
  questionStyle?: AiQuizQuestionStyle,
): ParseAiQuizJsonResult {
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { questions: [], errors: ['AI-svaret var ikke gyldig JSON.'] };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.questions)) {
    return { questions: [], errors: ['AI-svaret manglet questions-array.'] };
  }

  const rawQuestions = parsed.questions;
  if (rawQuestions.length < AI_GENERATE_QUESTION_MIN) {
    errors.push(`For få spørsmål (minst ${AI_GENERATE_QUESTION_MIN}).`);
  }
  if (rawQuestions.length > AI_GENERATE_QUESTION_MAX) {
    errors.push(`For mange spørsmål (maks ${AI_GENERATE_QUESTION_MAX}).`);
  }

  const questions: ParsedAiQuizQuestion[] = [];
  for (let i = 0; i < rawQuestions.length; i++) {
    const q = parseQuestion(rawQuestions[i], i);
    if (!q) {
      errors.push(`Spørsmål ${i + 1} har ugyldig format.`);
      continue;
    }
    questions.push(q);
  }

  if (questions.length === 0 && errors.length === 0) {
    errors.push('Ingen gyldige spørsmål i AI-svaret.');
  }

  const saveErrors = validateQuestionsForSave(questions);
  errors.push(...saveErrors);

  if (questionStyle && errors.length === 0) {
    errors.push(...validateAiQuestionStyle(questions, questionStyle));
  }

  if (errors.length > 0) {
    return { questions: [], errors };
  }

  return { questions: shuffleAiGeneratedMcOptions(questions), errors: [] };
}

export function clampAiQuestionCount(count: number): number {
  const rounded = Math.round(count);
  return Math.min(AI_GENERATE_QUESTION_MAX, Math.max(AI_GENERATE_QUESTION_MIN, rounded));
}
