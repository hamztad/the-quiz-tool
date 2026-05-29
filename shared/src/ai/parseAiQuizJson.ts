import { DEFAULT_MAX_POINTS } from '../constants/events.js';
import type { McOption, Question } from '../types/room.js';
import { validateQuestionsForSave } from '../import/parseQuizText.js';
import { createAnagramConfigForAnswer, validateAnagramAnswerText } from '../games/modules/anagram.js';
import { createDefaultDropBallConfig } from '../games/modules/dropBall.js';
import { createDefaultEmojiHuntConfig } from '../games/modules/emojiHunt.js';
import {
  createDefaultMathRaceConfig,
  validateMathExpressionConfig,
} from '../games/modules/mathExpression.js';
import { createDefaultRainbowPuzzleConfig } from '../games/modules/rainbowPuzzle.js';
import type { GameId, MathExpressionRaceConfig } from '../games/types.js';
import { validateOrderingQuestion } from '../ordering/orderingQuestion.js';
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
const MAX_ORDERING_ITEM_TEXT = 80;
const MAX_DIRECTION_LABEL_TEXT = 80;
const MAX_EXPRESSION_TEXT = 40;
const MAX_ANAGRAM_EVIDENCE_TEXT = 180;

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

function parseStringArray(raw: unknown, maxItems: number, maxLen: number): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > maxItems) return null;
  const values: string[] = [];
  for (const item of raw) {
    const value = asNonEmptyString(item, 'arrayItem', maxLen);
    if (!value) return null;
    if (!values.includes(value)) values.push(value);
  }
  return values.length === raw.length ? values : null;
}

function withCanonicalTitle(lines: ParsedAiQuizQuestion['lines'], title: string): ParsedAiQuizQuestion['lines'] {
  return [{ text: title, style: 'title' as const }, ...lines.slice(1)];
}

function parseAnagramEvidence(raw: Record<string, unknown>): { ok: true } | { ok: false } {
  const kind = raw.anagramKind;
  if (kind !== 'commonWord' && kind !== 'properNoun' && kind !== 'establishedPhrase') {
    return { ok: false };
  }
  const evidence = asNonEmptyString(raw.anagramEvidence, 'anagramEvidence', MAX_ANAGRAM_EVIDENCE_TEXT);
  if (!evidence) return { ok: false };
  return { ok: true };
}

function parseOrderingQuestion(raw: Record<string, unknown>, lines: ParsedAiQuizQuestion['lines']): ParsedAiQuizQuestion | null {
  const items = parseStringArray(raw.items, 5, MAX_ORDERING_ITEM_TEXT);
  const correctOrder = parseStringArray(raw.correctOrder, 5, MAX_ORDERING_ITEM_TEXT);
  if (!items || !correctOrder || items.length < 3 || correctOrder.length !== items.length) return null;
  const normalizedItems = items.map((text, index) => ({ id: `ai-order-${index}`, text }));
  const idByText = new Map(normalizedItems.map((item) => [item.text, item.id]));
  const orderingCorrectOrder = correctOrder.map((text) => idByText.get(text)).filter((id): id is string => Boolean(id));
  if (orderingCorrectOrder.length !== correctOrder.length) return null;

  const directionLabel = asNonEmptyString(raw.directionLabel, 'directionLabel', MAX_DIRECTION_LABEL_TEXT);
  const directionTop = asNonEmptyString(raw.directionLabelTop, 'directionLabelTop', MAX_DIRECTION_LABEL_TEXT);
  const directionBottom = asNonEmptyString(raw.directionLabelBottom, 'directionLabelBottom', MAX_DIRECTION_LABEL_TEXT);
  const splitDirection = directionLabel?.split(/→|->| til /iu).map((part) => part.trim()).filter(Boolean);

  const question: ParsedAiQuizQuestion = {
    type: 'ordering',
    lines,
    orderingDirectionTop: directionTop ?? splitDirection?.[0] ?? 'Øverst',
    orderingDirectionBottom: directionBottom ?? splitDirection?.[1] ?? 'Nederst',
    orderingItems: normalizedItems,
    orderingCorrectOrder,
    maxPoints: 2,
  };

  return validateOrderingQuestion(question).length === 0 ? question : null;
}

function parsePuzzleQuestion(raw: Record<string, unknown>, lines: ParsedAiQuizQuestion['lines']): ParsedAiQuizQuestion | null {
  const puzzleType = raw.puzzleType;
  if (puzzleType === 'anagram') {
    const answerText = asNonEmptyString(raw.answerText, 'answerText', 80);
    if (!parseAnagramEvidence(raw).ok) return null;
    if (!answerText || !validateAnagramAnswerText(answerText).ok) return null;
    return {
      type: 'game',
      lines: withCanonicalTitle(lines, 'Løs anagrammet'),
      gameType: 'anagram',
      game: createAnagramConfigForAnswer(answerText),
      maxPoints: 1,
    };
  }

  if (puzzleType === 'mathRace') {
    const expressions = parseStringArray(raw.expressions, 6, MAX_EXPRESSION_TEXT);
    if (!expressions || expressions.length < 2) return null;
    const game: MathExpressionRaceConfig = {
      ...createDefaultMathRaceConfig(),
      expressions,
    };
    if (!validateMathExpressionConfig(game).ok) return null;
    return {
      type: 'game',
      lines: withCanonicalTitle(lines, 'Regnerace'),
      gameType: 'mathExpression',
      game,
      maxPoints: 5,
    };
  }

  return null;
}

function parseOtherGameQuestion(raw: Record<string, unknown>, lines: ParsedAiQuizQuestion['lines']): ParsedAiQuizQuestion | null {
  const gameId = raw.gameId;
  if (gameId !== 'rainbowPuzzle' && gameId !== 'emojiHunt' && gameId !== 'dropBall') return null;
  const config =
    gameId === 'rainbowPuzzle'
      ? createDefaultRainbowPuzzleConfig()
      : gameId === 'emojiHunt'
        ? createDefaultEmojiHuntConfig()
        : createDefaultDropBallConfig();
  const canonicalTitle =
    gameId === 'rainbowPuzzle'
      ? 'Rainbow Puzzle'
      : gameId === 'emojiHunt'
        ? 'Emoji-jakt'
        : 'Drop the Ball';
  return {
    type: 'game',
    lines: withCanonicalTitle(lines, canonicalTitle),
    gameType: gameId as GameId,
    game: config,
    maxPoints: 5,
  };
}

function parseQuestion(raw: unknown, index: number): ParsedAiQuizQuestion | null {
  if (!isRecord(raw)) return null;
  const type = raw.type === 'multipleChoice' ? 'mc' : raw.type;
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

  if (type === 'ordering') {
    return parseOrderingQuestion(raw, lines);
  }

  if (type === 'puzzle') {
    return parsePuzzleQuestion(raw, lines);
  }

  if (type === 'game') {
    return parseOtherGameQuestion(raw, lines);
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

  if (style === 'quizPackage') {
    if (questions.length !== 5) {
      return [`Quizpakke må ha nøyaktig 5 oppgaver, men fikk ${questions.length}.`];
    }
    const slotErrors: string[] = [];
    if (questions[0]?.type !== 'open') slotErrors.push('Oppgave 1 må være åpent spørsmål.');
    if (questions[1]?.type !== 'mc') slotErrors.push('Oppgave 2 må være flervalg.');
    if (questions[2]?.type !== 'ordering') slotErrors.push('Oppgave 3 må være rekkefølge.');
    const slot4Game = questions[3]?.type === 'game' ? questions[3].game : undefined;
    if (
      !slot4Game ||
      !(slot4Game.gameId === 'mathExpression' && slot4Game.mode === 'race')
    ) {
      slotErrors.push('Oppgave 4 må være regnerace.');
    }
    const slot5Game = questions[4]?.type === 'game' ? questions[4].game : undefined;
    if (
      !slot5Game ||
      slot5Game.gameId === 'anagram' ||
      slot5Game.gameId === 'mathExpression' ||
      slot5Game.gameId === 'mathRace'
    ) {
      slotErrors.push('Oppgave 5 må være et annet eksisterende spill.');
    }
    return slotErrors;
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
