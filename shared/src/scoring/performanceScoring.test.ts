import { describe, expect, it } from 'vitest';
import { convertCurveToPerformancePoints, mapGraderPointsToPerformance } from './performanceScoring.js';
import { PERFORMANCE_TARGET_POINTS } from './quizScoringMode.js';

describe('convertCurveToPerformancePoints', () => {
  it('maps linear benchmark to target', () => {
    expect(
      convertCurveToPerformancePoints(3000, { kind: 'linear', benchmark: 3000 }),
    ).toBe(PERFORMANCE_TARGET_POINTS);
  });

  it('decays attempts for MC-style curve', () => {
    expect(
      convertCurveToPerformancePoints(1, { kind: 'attempt_decay', decay: 0.75, floor: 2500 }),
    ).toBe(PERFORMANCE_TARGET_POINTS);
    expect(
      convertCurveToPerformancePoints(2, { kind: 'attempt_decay', decay: 0.75, floor: 2500 }),
    ).toBe(7500);
    expect(
      convertCurveToPerformancePoints(4, { kind: 'attempt_decay', decay: 0.75, floor: 2500 }),
    ).toBe(2500);
  });

  it('maps grader points linearly to performance scale', () => {
    expect(mapGraderPointsToPerformance(5, 10)).toBe(5000);
    expect(mapGraderPointsToPerformance(10, 10)).toBe(PERFORMANCE_TARGET_POINTS);
  });
});
