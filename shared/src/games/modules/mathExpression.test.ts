import { describe, expect, it } from 'vitest';
import {
  buildMathExpressionResults,
  compareRegneraceResults,
  createDefaultMathRaceConfig,
  evaluateMathExpression,
  generateMathOptions,
  isMathAnswerCorrect,
  isMathExpressionSubmissionPayload,
  regneracePerformancePoints,
  regneraceRankValue,
  validateMathExpression,
} from './mathExpression.js';
import type { GameSubmission, MathExpressionSingleConfig } from '../types.js';

function raceSubmission(
  teamId: string,
  solvedCount: number,
  problemCount: number,
  timeUsedMs: number,
  timeLimitMs = 60_000,
  wrongAttempts?: number,
): GameSubmission {
  return {
    questionId: 'q1',
    teamId,
    gameId: 'mathExpression',
    payload: {
      gameId: 'mathExpression',
      mode: 'race',
      solvedCount,
      problemCount,
      timeUsedMs,
      timeLimitMs,
      wrongAttempts,
    },
    submittedAt: 1,
    serverReceivedAt: 1,
  };
}

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

  it('validates regnerace race submission payload', () => {
    expect(
      isMathExpressionSubmissionPayload({
        gameId: 'mathExpression',
        mode: 'race',
        solvedCount: 5,
        problemCount: 10,
        timeUsedMs: 42_000,
        timeLimitMs: 60_000,
      }),
    ).toBe(true);
  });
});

describe('regnerace completion scoring', () => {
  const config = createDefaultMathRaceConfig();
  config.expressions = Array.from({ length: 10 }, (_, i) => `${i + 1} + 1`);

  it('5/5 beats 4/5 even if 4/5 is faster', () => {
    const results = buildMathExpressionResults('q1', 5, config, [
      raceSubmission('fast', 4, 10, 20_000),
      raceSubmission('complete', 5, 10, 55_000),
    ]);

    expect(results[0]?.teamId).toBe('complete');
    expect(results[0]?.rank).toBe(1);
    expect(results[1]?.teamId).toBe('fast');
    expect(results[1]?.rank).toBe(2);
  });

  it('uses lower timeUsedMs as tie-break when solvedCount is equal', () => {
    const results = buildMathExpressionResults('q1', 5, config, [
      raceSubmission('slow', 8, 10, 50_000),
      raceSubmission('fast', 8, 10, 30_000),
    ]);

    expect(results[0]?.teamId).toBe('fast');
    expect(results[1]?.teamId).toBe('slow');
  });

  it('awards existing ranking bands based on completion ranking', () => {
    const results = buildMathExpressionResults('q1', 5, config, [
      raceSubmission('a', 10, 10, 42_000),
      raceSubmission('b', 8, 10, 20_000),
      raceSubmission('c', 6, 10, 25_000),
    ]);

    expect(results).toMatchObject([
      { teamId: 'a', rank: 1, quizPoints: 5 },
      { teamId: 'b', rank: 2, quizPoints: 3 },
      { teamId: 'c', rank: 3, quizPoints: 1 },
    ]);
  });

  it('does not rank teams without a race submission', () => {
    expect(buildMathExpressionResults('q1', 5, config, [], ['a'])).toEqual([]);
  });

  it('compareRegneraceResults orders by solved then time', () => {
    expect(
      compareRegneraceResults(
        { solvedCount: 5, timeUsedMs: 50_000 },
        { solvedCount: 4, timeUsedMs: 10_000 },
      ),
    ).toBeLessThan(0);
    expect(
      compareRegneraceResults(
        { solvedCount: 5, timeUsedMs: 40_000 },
        { solvedCount: 5, timeUsedMs: 50_000 },
      ),
    ).toBeLessThan(0);
  });

  it('regneraceRankValue encodes completion before time', () => {
    expect(regneraceRankValue(5, 50_000)).toBeGreaterThan(regneraceRankValue(4, 10_000));
    expect(regneraceRankValue(5, 40_000)).toBeGreaterThan(regneraceRankValue(5, 50_000));
  });
});

describe('regneracePerformancePoints', () => {
  const limit = 60_000;
  const total = 10;

  it('maps completion ratio to base score', () => {
    expect(regneracePerformancePoints(10, total, 42_000, limit)).toBeGreaterThanOrEqual(10_000);
    expect(regneracePerformancePoints(8, total, 20_000, limit)).toBe(8000);
    expect(regneracePerformancePoints(5, total, 20_000, limit)).toBe(5000);
    expect(regneracePerformancePoints(0, total, 20_000, limit)).toBe(0);
  });

  it('applies speed bonus only at full completion', () => {
    const fullFast = regneracePerformancePoints(10, total, 42_000, limit);
    const fullSlow = regneracePerformancePoints(10, total, 58_000, limit);
    const partialFast = regneracePerformancePoints(8, total, 10_000, limit);

    expect(fullFast).toBeGreaterThan(10_000);
    expect(fullFast).toBeGreaterThan(fullSlow);
    expect(partialFast).toBe(8000);
  });

  it('never lets lower completion beat higher completion because of speed', () => {
    const fiveOfFive = regneracePerformancePoints(5, 5, 55_000, limit);
    const fourOfFiveFast = regneracePerformancePoints(4, 5, 10_000, limit);
    expect(fiveOfFive).toBeGreaterThan(fourOfFiveFast);
  });

  it('full completion at 42s on 60s limit is about 10600', () => {
    const points = regneracePerformancePoints(10, 10, 42_000, 60_000);
    expect(points).toBeGreaterThanOrEqual(10_500);
    expect(points).toBeLessThanOrEqual(10_700);
  });
});
