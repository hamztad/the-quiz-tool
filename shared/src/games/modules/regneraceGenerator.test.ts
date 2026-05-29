import { describe, expect, it } from 'vitest';
import { evaluateMathExpression } from './mathExpression.js';
import {
  createRegneraceRandom,
  generateRegneraceProblem,
  maxRegneraceSolvedForTimeLimit,
  REGNERACE_ADD_SUB_MIN,
  REGNERACE_DIVIDEND_MAX,
  REGNERACE_DIVIDEND_MIN,
  REGNERACE_DIVISOR_MAX,
  REGNERACE_DIVISOR_MIN,
  REGNERACE_MUL_MAX,
  REGNERACE_MUL_MIN,
} from './regneraceGenerator.js';

describe('regneraceGenerator', () => {
  const rng = createRegneraceRandom(42);

  it('multiply uses factors between 3 and 12', () => {
    for (let i = 0; i < 40; i += 1) {
      const problem = generateRegneraceProblem(rng, ['multiply']);
      const parts = problem.expression.split('*').map((s) => Number(s.trim()));
      expect(parts).toHaveLength(2);
      for (const n of parts) {
        expect(n).toBeGreaterThanOrEqual(REGNERACE_MUL_MIN);
        expect(n).toBeLessThanOrEqual(REGNERACE_MUL_MAX);
      }
      expect(problem.answer).toBe(parts[0]! * parts[1]!);
    }
  });

  it('addition uses operands from 10 to 999', () => {
    for (let i = 0; i < 30; i += 1) {
      const problem = generateRegneraceProblem(rng, ['add']);
      const parts = problem.expression.split('+').map((s) => Number(s.trim()));
      expect(parts).toHaveLength(2);
      for (const n of parts) {
        expect(n).toBeGreaterThanOrEqual(REGNERACE_ADD_SUB_MIN);
        expect(n).toBeLessThanOrEqual(999);
      }
    }
  });

  it('subtraction has minuend greater than subtrahend and non-negative result', () => {
    for (let i = 0; i < 30; i += 1) {
      const problem = generateRegneraceProblem(rng, ['subtract']);
      const parts = problem.expression.split('-').map((s) => Number(s.trim()));
      expect(parts).toHaveLength(2);
      expect(parts[0]).toBeGreaterThan(parts[1]!);
      expect(problem.answer).toBeGreaterThan(0);
      expect(parts[0]).toBeGreaterThanOrEqual(REGNERACE_ADD_SUB_MIN);
      expect(parts[1]).toBeGreaterThanOrEqual(REGNERACE_ADD_SUB_MIN);
    }
  });

  it('division uses dividend and divisor in range with integer quotient', () => {
    for (let i = 0; i < 40; i += 1) {
      const problem = generateRegneraceProblem(rng, ['divide']);
      const parts = problem.expression.split(':').map((s) => Number(s.trim()));
      expect(parts).toHaveLength(2);
      const [dividend, divisor] = parts;
      expect(dividend).toBeGreaterThanOrEqual(REGNERACE_DIVIDEND_MIN);
      expect(dividend).toBeLessThanOrEqual(REGNERACE_DIVIDEND_MAX);
      expect(divisor).toBeGreaterThanOrEqual(REGNERACE_DIVISOR_MIN);
      expect(divisor).toBeLessThanOrEqual(REGNERACE_DIVISOR_MAX);
      expect(dividend! % divisor!).toBe(0);
      expect(problem.answer).toBe(dividend! / divisor!);
    }
  });

  it('expression evaluates to the stored answer', () => {
    for (let i = 0; i < 50; i += 1) {
      const problem = generateRegneraceProblem(rng, ['add', 'subtract', 'multiply', 'divide']);
      const value = evaluateMathExpression(problem.expression);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBe(problem.answer);
    }
  });

  it('respects enabled operations only', () => {
    const onlyAdd = createRegneraceRandom(7);
    for (let i = 0; i < 20; i += 1) {
      const problem = generateRegneraceProblem(onlyAdd, ['add']);
      expect(problem.operation).toBe('add');
      expect(problem.expression).toContain('+');
    }
  });

  it('maxRegneraceSolvedForTimeLimit scales with duration', () => {
    expect(maxRegneraceSolvedForTimeLimit(60_000)).toBeGreaterThan(maxRegneraceSolvedForTimeLimit(30_000));
  });
});
