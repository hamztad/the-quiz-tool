import type { PerformanceCurve } from './performanceTypes.js';
import { PERFORMANCE_TARGET_POINTS } from './quizScoringMode.js';

export function convertCurveToPerformancePoints(raw: number, curve: PerformanceCurve): number {
  if (!Number.isFinite(raw)) return 0;

  switch (curve.kind) {
    case 'fixed':
      return raw > 0 ? Math.round(curve.correct) : Math.round(curve.incorrect);
    case 'linear': {
      if (raw <= 0) return 0;
      const ratio = raw / curve.benchmark;
      const scaled = ratio * PERFORMANCE_TARGET_POINTS;
      const min = curve.minRatio != null ? curve.minRatio * PERFORMANCE_TARGET_POINTS : 0;
      return Math.max(0, Math.round(Math.max(scaled, min)));
    }
    case 'power': {
      if (raw <= 0) return 0;
      const ratio = raw / curve.benchmark;
      const scaled = Math.pow(Math.max(0, ratio), curve.exponent) * PERFORMANCE_TARGET_POINTS;
      return Math.max(0, Math.round(scaled));
    }
    case 'inverse_exp': {
      const diff = Math.max(0, raw - curve.perfectRaw);
      if (curve.zeroAbove != null && diff >= curve.zeroAbove) return 0;
      const value = PERFORMANCE_TARGET_POINTS * Math.exp(-curve.decayK * diff);
      return Math.max(0, Math.round(value));
    }
    case 'attempt_decay': {
      if (raw <= 0) return 0;
      const attempt = Math.max(1, Math.round(raw));
      if (attempt >= 4) return Math.round(curve.floor);
      const value =
        PERFORMANCE_TARGET_POINTS * Math.pow(curve.decay, attempt - 1);
      return Math.max(0, Math.round(value));
    }
    case 'reveal_decay': {
      if (!curve.correct) return 0;
      const ratio = Math.max(0, Math.min(1, curve.openedRatio));
      const remaining = Math.pow(1 - ratio, curve.exponent);
      const scaled = PERFORMANCE_TARGET_POINTS * curve.ceiling * remaining;
      return Math.max(Math.round(curve.minScore), Math.round(scaled));
    }
    default:
      return 0;
  }
}

/** Map ranking-scale grader points (0–10) to prestasjonspoeng. */
export function mapGraderPointsToPerformance(graderPoints: number, maxPoints: number): number {
  if (!Number.isFinite(graderPoints) || maxPoints <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, graderPoints / maxPoints));
  return Math.round(ratio * PERFORMANCE_TARGET_POINTS);
}
