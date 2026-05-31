import type {
  GameResult,
  GameSubmission,
  MathExpressionConfig,
  MathExpressionRaceConfig,
  MathExpressionRaceSubmissionPayload,
  MathExpressionSingleConfig,
  MathExpressionSingleSubmissionPayload,
  MathExpressionSubmissionPayload,
  MathRaceTimeLimitPreset,
  RegneraceOperation,
} from '../types.js';
import {
  DEFAULT_REGNERACE_OPERATIONS,
  maxRegneraceSolvedForTimeLimit,
  normalizeRegneraceOperations,
} from './regneraceGenerator.js';
import { PERFORMANCE_TARGET_POINTS } from '../../scoring/quizScoringMode.js';
import { clampQuizPointsPerQuestion } from '../../scoring/quizScoring.js';
import { rankGameEntries } from '../ranking.js';
import { quizPointsForRank } from '../scoring.js';

export const MATH_EXPRESSION_MIN_TERMS = 2;
export const MATH_EXPRESSION_MAX_TERMS = 4;
export const DEFAULT_MATH_RACE_WRONG_PENALTY_MS = 3_000;
export const DEFAULT_MATH_RACE_TIME_LIMIT_MS = 60_000;
export const REGNERACE_RANK_TIME_SCALE = 1_000_000_000;
export const REGNERACE_MAX_SPEED_BONUS = 2_000;

export function mathRaceTimeLimitMsForPreset(preset: MathRaceTimeLimitPreset): number {
  switch (preset) {
    case '30s':
      return 30_000;
    case '60s':
      return 60_000;
    case '90s':
      return 90_000;
    case '120s':
      return 120_000;
    default:
      return DEFAULT_MATH_RACE_TIME_LIMIT_MS;
  }
}

export function normalizeMathRaceConfig(config: MathExpressionRaceConfig): MathExpressionRaceConfig {
  const preset = config.timeLimitPreset ?? '60s';
  const timeLimitMs =
    config.timeLimitMs ??
    (preset === 'custom' ? DEFAULT_MATH_RACE_TIME_LIMIT_MS : mathRaceTimeLimitMsForPreset(preset));
  const enabledOperations = normalizeRegneraceOperations(
    config.enabledOperations ??
      (config.expressions && config.expressions.length > 0
        ? DEFAULT_REGNERACE_OPERATIONS
        : undefined),
  );
  return {
    ...config,
    enabledOperations,
    timeLimitMs: Math.max(5_000, Math.min(600_000, Math.round(timeLimitMs))),
    timeLimitPreset: preset,
    rankingMode: 'highest',
    wrongPenaltyMs: config.wrongPenaltyMs ?? DEFAULT_MATH_RACE_WRONG_PENALTY_MS,
  };
}

export function formatRegneraceResultLabel(
  solvedCount: number,
  _problemCount: number,
  timeUsedMs: number,
): string {
  const solved = Math.max(0, Math.round(solvedCount));
  const seconds = (Math.max(0, timeUsedMs) / 1000).toFixed(1).replace('.', ',');
  return `${solved} løst · ${seconds} sek`;
}

export function clampRegneraceRaceSubmission(
  payload: Pick<
    MathExpressionRaceSubmissionPayload,
    'solvedCount' | 'problemCount' | 'timeUsedMs' | 'timeLimitMs' | 'wrongAttempts'
  >,
  configTimeLimitMs: number,
): MathExpressionRaceSubmissionPayload {
  const timeLimitMs = Math.max(
    5_000,
    Math.min(600_000, Math.round(payload.timeLimitMs || configTimeLimitMs)),
  );
  const maxSolved = maxRegneraceSolvedForTimeLimit(timeLimitMs);
  const timeUsedMs = Math.min(timeLimitMs, Math.max(0, Math.round(payload.timeUsedMs)));
  const solvedCount = Math.min(maxSolved, Math.max(0, Math.round(payload.solvedCount)));
  let problemCount = Math.min(maxSolved, Math.max(solvedCount, Math.round(payload.problemCount)));
  if (problemCount < solvedCount) problemCount = solvedCount;
  return {
    gameId: 'mathExpression',
    mode: 'race',
    solvedCount,
    problemCount,
    timeUsedMs,
    timeLimitMs,
    wrongAttempts:
      payload.wrongAttempts != null
        ? Math.max(0, Math.round(payload.wrongAttempts))
        : undefined,
  };
}

export function regneraceRankValue(solvedCount: number, timeUsedMs: number): number {
  const solved = Math.max(0, Math.round(solvedCount));
  const time = Math.max(0, Math.round(timeUsedMs));
  return solved * REGNERACE_RANK_TIME_SCALE - time;
}

export function regneracePerformancePoints(
  solvedCount: number,
  problemCount: number,
  timeUsedMs: number,
  timeLimitMs: number,
): number {
  const total = Math.max(1, Math.round(problemCount));
  const solved = Math.max(0, Math.min(total, Math.round(solvedCount)));
  const base = Math.round(PERFORMANCE_TARGET_POINTS * (solved / total));
  if (solved < total) return base;

  const limit = Math.max(1, Math.round(timeLimitMs));
  const used = Math.max(0, Math.min(limit, Math.round(timeUsedMs)));
  const remainingRatio = Math.max(0, (limit - used) / limit);
  const bonus = Math.round(REGNERACE_MAX_SPEED_BONUS * remainingRatio);
  return base + bonus;
}

export function compareRegneraceResults(
  a: Pick<MathExpressionRaceSubmissionPayload, 'solvedCount' | 'timeUsedMs'>,
  b: Pick<MathExpressionRaceSubmissionPayload, 'solvedCount' | 'timeUsedMs'>,
): number {
  if (a.solvedCount !== b.solvedCount) return b.solvedCount - a.solvedCount;
  return a.timeUsedMs - b.timeUsedMs;
}

type Operator = '+' | '-' | '*' | '/';

interface ParsedExpression {
  numbers: number[];
  operators: Operator[];
}

export interface MathExpressionValidation {
  ok: boolean;
  errors: string[];
  value?: number;
}

function normalizeOperator(value: string): Operator | null {
  if (value === '+' || value === '-') return value;
  if (value === '*' || value === 'x' || value === 'X') return '*';
  if (value === '/' || value === ':') return '/';
  return null;
}

function normalizeNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

export function parseMathExpression(expression: string): ParsedExpression {
  const input = expression.trim();
  if (!input) throw new Error('Regnestykket mangler.');
  if (/[^0-9+\-*/xX:.,\s]/u.test(input)) {
    throw new Error('Regnestykket inneholder tegn som ikke er støttet.');
  }

  const tokenRegex = /(\d+(?:[.,]\d+)?|[+\-*/xX:])/gu;
  const tokens = Array.from(input.matchAll(tokenRegex), (match) => match[0]);
  if (tokens.join('').length !== input.replace(/\s+/g, '').length) {
    throw new Error('Regnestykket har ugyldig syntaks.');
  }
  if (tokens.length < 3 || tokens.length % 2 === 0) {
    throw new Error('Bruk tall og operatorer annenhver gang.');
  }

  const numbers: number[] = [];
  const operators: Operator[] = [];

  tokens.forEach((token, index) => {
    if (index % 2 === 0) {
      if (token.length > 20) throw new Error('Hvert tall kan være maks 20 tegn.');
      const number = normalizeNumber(token);
      if (!Number.isFinite(number)) throw new Error('Ugyldig tall i regnestykket.');
      numbers.push(number);
    } else {
      const operator = normalizeOperator(token);
      if (!operator) throw new Error('Ugyldig regneoperator.');
      operators.push(operator);
    }
  });

  if (numbers.length < MATH_EXPRESSION_MIN_TERMS || numbers.length > MATH_EXPRESSION_MAX_TERMS) {
    throw new Error(`Bruk ${MATH_EXPRESSION_MIN_TERMS}-${MATH_EXPRESSION_MAX_TERMS} tall per regnestykke.`);
  }
  operators.forEach((operator, index) => {
    if (operator === '/' && numbers[index + 1] === 0) {
      throw new Error('Deling på null er ikke tillatt.');
    }
  });

  return { numbers, operators };
}

export function evaluateMathExpression(expression: string): number {
  const parsed = parseMathExpression(expression);
  const numbers = [...parsed.numbers];
  const operators = [...parsed.operators];

  for (let i = 0; i < operators.length; i += 1) {
    const operator = operators[i];
    if (operator !== '*' && operator !== '/') continue;
    const next = operator === '*'
      ? numbers[i] * numbers[i + 1]
      : numbers[i] / numbers[i + 1];
    numbers.splice(i, 2, next);
    operators.splice(i, 1);
    i -= 1;
  }

  return operators.reduce((result, operator, index) => {
    const next = numbers[index + 1];
    return operator === '+' ? result + next : result - next;
  }, numbers[0]);
}

export function validateMathExpression(expression: string): MathExpressionValidation {
  try {
    return { ok: true, errors: [], value: evaluateMathExpression(expression) };
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : 'Ugyldig regnestykke.'],
    };
  }
}

export function formatMathAnswer(value: number, decimals: 0 | 1 | 2 = 2): string {
  const rounded = Number(value.toFixed(decimals));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(decimals);
}

export function expectedMathAnswer(config: MathExpressionSingleConfig | { expression: string; rounding?: 'exact' | 'rounded'; decimals?: 0 | 1 | 2 }): number {
  const value = evaluateMathExpression(config.expression);
  if (config.rounding === 'rounded') {
    return Number(value.toFixed(config.decimals ?? 0));
  }
  return value;
}

export function parseMathAnswer(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/u.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isMathAnswerCorrect(
  answer: string,
  expression: string,
  options: { rounding?: 'exact' | 'rounded'; decimals?: 0 | 1 | 2 } = {},
): boolean {
  const actual = parseMathAnswer(answer);
  if (actual === null) return false;
  const expected = expectedMathAnswer({
    expression,
    rounding: options.rounding ?? 'exact',
    decimals: options.decimals ?? 0,
  });
  if (options.rounding === 'rounded') {
    return Math.abs(actual - expected) < 1e-9;
  }
  return Math.abs(actual - expected) < 1e-9;
}

function mathOptionOnesDigit(value: number): number {
  return ((Math.round(value) % 10) + 10) % 10;
}

function mathOptionsHaveConsecutivePair(values: number[]): boolean {
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      if (Math.abs(values[i]! - values[j]!) === 1) return true;
    }
  }
  return false;
}

function mathOptionsShareOnesDigit(values: number[]): boolean {
  const counts = new Map<number, number>();
  for (const value of values) {
    const digit = mathOptionOnesDigit(value);
    counts.set(digit, (counts.get(digit) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= 2);
}

function candidateWrongAnswer(
  correct: number,
  targetOnes: number,
  rng: () => number,
): number {
  const correctOnes = mathOptionOnesDigit(correct);
  const deltaOnes = (targetOnes - correctOnes + 10) % 10;
  const magnitude = 10 + Math.floor(rng() * 8) * 10;
  const sign = rng() < 0.5 ? -1 : 1;
  let candidate = correct + sign * magnitude + deltaOnes;
  if (candidate === correct) candidate += sign * 10;
  if (candidate <= 0) candidate = correct + magnitude + deltaOnes;
  if (candidate === correct) candidate += 10;
  return candidate;
}

function buildMathOptionValues(
  correct: number,
  rng: () => number,
): [number, number, number] | null {
  const correctOnes = mathOptionOnesDigit(correct);
  const wrongOffsets = [10, 20, -10, -20, 3, 7, -3, -7, 5, -5, 15, -15, 30, -30];

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const wrongA =
      attempt % 3 === 0
        ? candidateWrongAnswer(correct, correctOnes, rng)
        : correct + wrongOffsets[Math.floor(rng() * wrongOffsets.length)]!;
    const sharedOnes = attempt % 2 === 0 ? correctOnes : mathOptionOnesDigit(wrongA);
    let wrongB = candidateWrongAnswer(correct, sharedOnes, rng);
    if (wrongB === wrongA) wrongB = candidateWrongAnswer(correct, sharedOnes, rng);

    const nums = [correct, wrongA, wrongB];
    const unique = new Set(nums);
    if (unique.size !== 3) continue;
    if (mathOptionsHaveConsecutivePair(nums)) continue;
    if (!mathOptionsShareOnesDigit(nums)) continue;
    return [correct, wrongA, wrongB];
  }

  const fallbackA = correct + 10;
  let fallbackB = correct + 20;
  if (mathOptionOnesDigit(fallbackB) !== mathOptionOnesDigit(correct)) {
    fallbackB = correct - 20;
  }
  const nums = [correct, fallbackA, fallbackB];
  if (
    new Set(nums).size === 3 &&
    !mathOptionsHaveConsecutivePair(nums) &&
    mathOptionsShareOnesDigit(nums)
  ) {
    return [correct, fallbackA, fallbackB];
  }
  return null;
}

export function generateMathOptions(
  expression: string,
  options: { decimals?: 0 | 1 | 2; rounding?: 'exact' | 'rounded' } = {},
): string[] {
  const correct = expectedMathAnswer({
    expression,
    rounding: options.rounding ?? 'rounded',
    decimals: options.decimals ?? 0,
  });
  const decimals = options.decimals ?? 0;
  const built = buildMathOptionValues(correct, Math.random);
  const values = built ?? [correct, correct + 10, correct + 20];
  const formatted = values.map((value) => formatMathAnswer(value, decimals));
  return formatted.sort(() => Math.random() - 0.5);
}

export function createDefaultMathExpressionConfig(): MathExpressionConfig {
  return {
    gameId: 'mathExpression',
    mode: 'single',
    title: 'Regnestykke',
    instructions: 'Løs regnestykket.',
    expression: '2 + 2',
    rounding: 'exact',
    decimals: 0,
    rankingMode: 'highest',
    resultKind: 'directScore',
    pointMode: 'directScoreToPoints',
  };
}

/** Standard når Regnestykke legges til (AI, import, editor) — dynamisk generering under spill. */
export function createDefaultMathGameConfig(): MathExpressionRaceConfig {
  return createDefaultMathRaceConfig();
}

export function createDefaultMathRaceConfig(): MathExpressionRaceConfig {
  return normalizeMathRaceConfig({
    gameId: 'mathExpression',
    mode: 'race',
    title: 'Regnerace',
    instructions: 'Løs så mange regnestykker som mulig før tiden er ute.',
    enabledOperations: [...DEFAULT_REGNERACE_OPERATIONS],
    answerMode: 'input',
    timeLimitMs: DEFAULT_MATH_RACE_TIME_LIMIT_MS,
    timeLimitPreset: '60s',
    wrongPenaltyMs: DEFAULT_MATH_RACE_WRONG_PENALTY_MS,
    rankingMode: 'highest',
    resultKind: 'ranked',
    pointMode: 'rankedBands',
    pointBands: [
      { rank: 1, points: 5 },
      { rank: 2, points: 3 },
      { rank: 3, points: 1 },
    ],
  });
}

export function validateMathExpressionConfig(config: MathExpressionConfig): MathExpressionValidation {
  if (config.mode === 'single') return validateMathExpression(config.expression);
  if (config.mode !== 'race') return { ok: false, errors: ['Ukjent regnemodus.'] };
  const normalized = normalizeMathRaceConfig(config);
  const errors: string[] = [];
  if (!normalized.enabledOperations?.length) {
    errors.push('Velg minst én regneart for Regnerace.');
  }
  if (!Number.isFinite(normalized.timeLimitMs) || normalized.timeLimitMs < 5_000) {
    errors.push('Tidsbegrensning må være minst 5 sekunder.');
  }
  return { ok: errors.length === 0, errors };
}

export type { RegneraceOperation };

export function isMathExpressionSubmissionPayload(
  payload: unknown,
): payload is MathExpressionSubmissionPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  if (record.gameId !== 'mathExpression') return false;
  if (record.mode === 'single') return typeof record.answer === 'string';
  if (record.mode === 'race') {
    return (
      typeof record.solvedCount === 'number' &&
      typeof record.problemCount === 'number' &&
      typeof record.timeUsedMs === 'number' &&
      typeof record.timeLimitMs === 'number'
    );
  }
  return false;
}

export function buildMathExpressionResults(
  questionId: string,
  maxPoints: number,
  config: MathExpressionConfig,
  submissions: GameSubmission[],
  teamIds: string[] = [],
): GameResult[] {
  const mathSubmissions = submissions.filter(
    (submission): submission is GameSubmission & { payload: MathExpressionSubmissionPayload } =>
      isMathExpressionSubmissionPayload(submission.payload),
  );

  if (config.mode === 'single') {
    const latestByTeam = new Map<string, MathExpressionSingleSubmissionPayload>();
    for (const submission of mathSubmissions) {
      if (submission.payload.mode === 'single') latestByTeam.set(submission.teamId, submission.payload);
    }
    return Array.from(new Set([...teamIds, ...latestByTeam.keys()])).map((teamId) => {
      const payload = latestByTeam.get(teamId);
      const correct = payload
        ? isMathAnswerCorrect(payload.answer, config.expression, {
            rounding: config.rounding,
            decimals: config.decimals,
          })
        : false;
      return {
        questionId,
        teamId,
        gameId: 'mathExpression',
        rankValue: correct ? 1 : 0,
        displayValue: correct ? 'Riktig svar' : payload ? 'Feil svar' : 'Ikke besvart',
        rank: 0,
        quizPoints: correct ? clampQuizPointsPerQuestion(maxPoints) : 0,
        status: 'ranked' as const,
      };
    });
  }

  const raceConfig = normalizeMathRaceConfig(config);
  const completedByTeam = new Map<string, MathExpressionRaceSubmissionPayload>();
  for (const submission of mathSubmissions) {
    if (submission.payload.mode !== 'race') continue;
    const existing = completedByTeam.get(submission.teamId);
    if (
      !existing ||
      compareRegneraceResults(submission.payload, existing) < 0
    ) {
      completedByTeam.set(submission.teamId, submission.payload);
    }
  }

  const ranked = rankGameEntries(
    Array.from(completedByTeam.entries()).map(([teamId, payload]) => ({
      teamId,
      rankValue: regneraceRankValue(payload.solvedCount, payload.timeUsedMs),
    })),
    raceConfig.rankingMode,
  );

  return ranked.map((entry) => {
    const payload = completedByTeam.get(entry.teamId)!;
    const wrongSuffix =
      payload.wrongAttempts && payload.wrongAttempts > 0
        ? ` · ${payload.wrongAttempts} feil`
        : '';
    return {
      questionId,
      teamId: entry.teamId,
      gameId: 'mathExpression',
      rankValue: entry.rankValue,
      displayValue: `${formatRegneraceResultLabel(
        payload.solvedCount,
        payload.problemCount,
        payload.timeUsedMs,
      )}${wrongSuffix}`,
      rank: entry.rank,
      quizPoints: quizPointsForRank(entry.rank, maxPoints, raceConfig.pointMode, raceConfig.pointBands),
      status: 'ranked' as const,
    };
  });
}
