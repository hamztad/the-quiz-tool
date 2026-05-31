import type { RegneraceOperation } from '../types.js';
import { evaluateMathExpression } from './mathExpression.js';

export const REGNERACE_MUL_MIN = 3;
export const REGNERACE_MUL_MAX = 12;
/** Tosifrede ledd (10–99). */
export const REGNERACE_ADD_SUB_MIN = 10;
export const REGNERACE_ADD_SUB_MAX = 99;
export const REGNERACE_DIVISOR_MIN = 12;
export const REGNERACE_DIVISOR_MAX = 150;
/** Kvotient (svar) minst 2 — dividend ≠ divisor. */
export const REGNERACE_QUOTIENT_MIN = 2;
export const REGNERACE_QUOTIENT_MAX = 12;

export const DEFAULT_REGNERACE_OPERATIONS: RegneraceOperation[] = [
  'add',
  'subtract',
  'multiply',
  'divide',
];

export interface RegneraceGeneratedProblem {
  expression: string;
  answer: number;
  operation: RegneraceOperation;
}

type RegneraceRandomFn = () => number;

export function createRegneraceRandom(seed: number): RegneraceRandomFn {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeedString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomInt(rng: RegneraceRandomFn, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pickOperation(rng: RegneraceRandomFn, enabled: RegneraceOperation[]): RegneraceOperation {
  const index = Math.floor(rng() * enabled.length);
  return enabled[index] ?? enabled[0]!;
}

function twoDigitOperand(rng: RegneraceRandomFn): number {
  return randomInt(rng, REGNERACE_ADD_SUB_MIN, REGNERACE_ADD_SUB_MAX);
}

function generateMultiply(rng: RegneraceRandomFn): RegneraceGeneratedProblem {
  const a = randomInt(rng, REGNERACE_MUL_MIN, REGNERACE_MUL_MAX);
  const b = randomInt(rng, REGNERACE_MUL_MIN, REGNERACE_MUL_MAX);
  const expression = `${a} * ${b}`;
  return { expression, answer: a * b, operation: 'multiply' };
}

function generateAdd(rng: RegneraceRandomFn): RegneraceGeneratedProblem {
  const termCount = rng() < 0.5 ? 2 : 3;
  const terms = Array.from({ length: termCount }, () => twoDigitOperand(rng));
  const expression = terms.join(' + ');
  const answer = terms.reduce((sum, n) => sum + n, 0);
  return { expression, answer, operation: 'add' };
}

function generateSubtract(rng: RegneraceRandomFn): RegneraceGeneratedProblem {
  const a = twoDigitOperand(rng);
  const b = randomInt(rng, REGNERACE_ADD_SUB_MIN, Math.min(a - 1, REGNERACE_ADD_SUB_MAX));
  const expression = `${a} - ${b}`;
  return { expression, answer: a - b, operation: 'subtract' };
}

function generateDivide(rng: RegneraceRandomFn): RegneraceGeneratedProblem {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const divisor = randomInt(rng, REGNERACE_DIVISOR_MIN, REGNERACE_DIVISOR_MAX);
    const quotient = randomInt(rng, REGNERACE_QUOTIENT_MIN, REGNERACE_QUOTIENT_MAX);
    const dividend = divisor * quotient;
    if (dividend <= 2 || dividend === divisor) continue;
    const expression = `${dividend} : ${divisor}`;
    return { expression, answer: quotient, operation: 'divide' };
  }
  return { expression: '144 : 12', answer: 12, operation: 'divide' };
}

export function generateRegneraceProblem(
  rng: RegneraceRandomFn,
  enabledOperations: RegneraceOperation[],
): RegneraceGeneratedProblem {
  const ops =
    enabledOperations.length > 0 ? enabledOperations : DEFAULT_REGNERACE_OPERATIONS;
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const operation = pickOperation(rng, ops);
    const problem =
      operation === 'multiply'
        ? generateMultiply(rng)
        : operation === 'add'
          ? generateAdd(rng)
          : operation === 'subtract'
            ? generateSubtract(rng)
            : generateDivide(rng);
    const evaluated = evaluateMathExpression(problem.expression);
    if (Number.isInteger(evaluated) && evaluated === problem.answer) {
      return problem;
    }
  }
  return generateMultiply(rng);
}

export function normalizeRegneraceOperations(
  operations: RegneraceOperation[] | undefined,
): RegneraceOperation[] {
  const allowed = new Set<RegneraceOperation>(DEFAULT_REGNERACE_OPERATIONS);
  const unique = (operations ?? DEFAULT_REGNERACE_OPERATIONS).filter((op) => allowed.has(op));
  return unique.length > 0 ? unique : [...DEFAULT_REGNERACE_OPERATIONS];
}

export function maxRegneraceSolvedForTimeLimit(timeLimitMs: number): number {
  const ms = Math.max(5_000, Math.round(timeLimitMs));
  return Math.max(1, Math.ceil(ms / 800));
}
