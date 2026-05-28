import type {
  GameResult,
  GameSubmission,
  MathExpressionConfig,
  MathExpressionRaceConfig,
  MathExpressionRaceSubmissionPayload,
  MathExpressionSingleConfig,
  MathExpressionSingleSubmissionPayload,
  MathExpressionSubmissionPayload,
} from '../types.js';
import { clampQuizPointsPerQuestion } from '../../scoring/quizScoring.js';
import { rankGameEntries } from '../ranking.js';
import { quizPointsForRank } from '../scoring.js';

export const MATH_EXPRESSION_MIN_TERMS = 2;
export const MATH_EXPRESSION_MAX_TERMS = 4;
export const MATH_RACE_MIN_EXPRESSIONS = 2;
export const MATH_RACE_MAX_EXPRESSIONS = 10;
export const DEFAULT_MATH_RACE_WRONG_PENALTY_MS = 3_000;

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
  const deltas = [1, -1, 2, -2, 10, -10];
  const values = new Set<string>([formatMathAnswer(correct, decimals)]);
  for (const delta of deltas) {
    if (values.size >= 3) break;
    values.add(formatMathAnswer(correct + delta, decimals));
  }
  return Array.from(values).slice(0, 3).sort(() => 0.5 - Math.random());
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

export function createDefaultMathRaceConfig(): MathExpressionRaceConfig {
  return {
    gameId: 'mathExpression',
    mode: 'race',
    title: 'Regnerace',
    instructions: 'Løs regnestykkene raskest mulig.',
    expressions: ['2 + 2', '3 * 4'],
    answerMode: 'input',
    wrongPenaltyMs: DEFAULT_MATH_RACE_WRONG_PENALTY_MS,
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

export function validateMathExpressionConfig(config: MathExpressionConfig): MathExpressionValidation {
  if (config.mode === 'single') return validateMathExpression(config.expression);
  if (config.mode !== 'race') return { ok: false, errors: ['Ukjent regnemodus.'] };
  const errors: string[] = [];
  if (!Array.isArray(config.expressions)) {
    return { ok: false, errors: ['Regnerace mangler regnestykker.'] };
  }
  if (config.expressions.length < MATH_RACE_MIN_EXPRESSIONS || config.expressions.length > MATH_RACE_MAX_EXPRESSIONS) {
    errors.push(`Regnerace må ha ${MATH_RACE_MIN_EXPRESSIONS}-${MATH_RACE_MAX_EXPRESSIONS} regnestykker.`);
  }
  config.expressions.forEach((expression, index) => {
    const validation = validateMathExpression(expression);
    if (!validation.ok) errors.push(`${index + 1}: ${validation.errors.join(' ')}`);
  });
  return { ok: errors.length === 0, errors };
}

export function isMathExpressionSubmissionPayload(
  payload: unknown,
): payload is MathExpressionSubmissionPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  if (record.gameId !== 'mathExpression') return false;
  if (record.mode === 'single') return typeof record.answer === 'string';
  if (record.mode === 'race') {
    return typeof record.totalMs === 'number' && typeof record.penalties === 'number';
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

  const completedByTeam = new Map<string, MathExpressionRaceSubmissionPayload>();
  for (const submission of mathSubmissions) {
    if (submission.payload.mode !== 'race') continue;
    if (!completedByTeam.has(submission.teamId)) completedByTeam.set(submission.teamId, submission.payload);
  }

  const ranked = rankGameEntries(
    Array.from(completedByTeam.entries()).map(([teamId, payload]) => ({
      teamId,
      rankValue: Math.max(0, Math.round(payload.totalMs)),
    })),
    config.rankingMode,
  );

  return ranked.map((entry) => {
    const payload = completedByTeam.get(entry.teamId);
    return {
      questionId,
      teamId: entry.teamId,
      gameId: 'mathExpression',
      rankValue: entry.rankValue,
      displayValue: `${(entry.rankValue / 1000).toFixed(2)} sekunder${payload?.penalties ? ` · ${payload.penalties} feil` : ''}`,
      rank: entry.rank,
      quizPoints: quizPointsForRank(entry.rank, maxPoints, config.pointMode, config.pointBands),
      status: 'ranked' as const,
    };
  });
}
