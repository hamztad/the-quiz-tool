import { describe, expect, it } from 'vitest';
import {
  buildMathExpressionResults,
  createDefaultMathRaceConfig,
  evaluateMathExpression,
  generateMathOptions,
  isMathAnswerCorrect,
  validateMathExpression,
} from './mathExpression.js';
import type { GameSubmission, MathExpressionSingleConfig } from '../types.js';

describe('mathExpression', () => {
  it('parses and applies operator precedence', () => {
    expect(evaluateMathExpression('2 + 3 * 4')).toBe(14);
  });

  it('supports x and * multiplication', () => {
    expect(evaluateMathExpression('2 x 3')).toBe(6);
    expect(evaluateMathExpression('2 * 3')).toBe(6);
  });

  it('supports / and : division', () => {
    expect(evaluateMathExpression('8 / 2')).toBe(4);
    expect(evaluateMathExpression('8 : 2')).toBe(4);
  });

  it('supports comma decimals', () => {
    expect(evaluateMathExpression('3,5 + 1,5')).toBe(5);
  });

  it('rejects division by zero', () => {
    expect(validateMathExpression('4 / 0').ok).toBe(false);
  });

  it('scores single-mode correct and incorrect answers', () => {
    const config: MathExpressionSingleConfig = {
      gameId: 'mathExpression',
      mode: 'single',
      expression: '2 + 2',
      rounding: 'exact',
      decimals: 0,
      rankingMode: 'highest',
      resultKind: 'directScore',
      pointMode: 'directScoreToPoints',
    };
    const submissions: GameSubmission[] = [
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'mathExpression',
        payload: { gameId: 'mathExpression', mode: 'single', answer: '4' },
        submittedAt: 1,
        serverReceivedAt: 1,
      },
      {
        questionId: 'q1',
        teamId: 'b',
        gameId: 'mathExpression',
        payload: { gameId: 'mathExpression', mode: 'single', answer: '5' },
        submittedAt: 2,
        serverReceivedAt: 2,
      },
    ];

    expect(buildMathExpressionResults('q1', 1, config, submissions, ['a', 'b'])).toMatchObject([
      { teamId: 'a', quizPoints: 1 },
      { teamId: 'b', quizPoints: 0 },
    ]);
  });

  it('checks rounded answers', () => {
    expect(isMathAnswerCorrect('3.33', '10 / 3', { rounding: 'rounded', decimals: 2 })).toBe(true);
  });

  it('generates three options including correct answer', () => {
    expect(generateMathOptions('2 + 2', { decimals: 0 })).toContain('4');
    expect(generateMathOptions('2 + 2', { decimals: 0 })).toHaveLength(3);
  });

  it('ranks race lower time first and awards top 3', () => {
    const config = createDefaultMathRaceConfig();
    const submissions: GameSubmission[] = [
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'mathExpression',
        payload: { gameId: 'mathExpression', mode: 'race', totalMs: 30_000, penalties: 0 },
        submittedAt: 1,
        serverReceivedAt: 1,
      },
      {
        questionId: 'q1',
        teamId: 'b',
        gameId: 'mathExpression',
        payload: { gameId: 'mathExpression', mode: 'race', totalMs: 20_000, penalties: 1 },
        submittedAt: 2,
        serverReceivedAt: 2,
      },
      {
        questionId: 'q1',
        teamId: 'c',
        gameId: 'mathExpression',
        payload: { gameId: 'mathExpression', mode: 'race', totalMs: 25_000, penalties: 0 },
        submittedAt: 3,
        serverReceivedAt: 3,
      },
    ];

    expect(buildMathExpressionResults('q1', 5, config, submissions)).toMatchObject([
      { teamId: 'b', rank: 1, quizPoints: 5 },
      { teamId: 'c', rank: 2, quizPoints: 3 },
      { teamId: 'a', rank: 3, quizPoints: 1 },
    ]);
  });

  it('does not rank non-completed race teams', () => {
    const config = createDefaultMathRaceConfig();
    expect(buildMathExpressionResults('q1', 5, config, [], ['a'])).toEqual([]);
  });
});
