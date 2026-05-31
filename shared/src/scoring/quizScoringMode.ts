import type { QuizScoringMode, RoomSettings } from '../types/room.js';

export const PERFORMANCE_TARGET_POINTS = 10_000;

export function resolveScoringMode(
  settings: Pick<RoomSettings, 'scoringMode'> | undefined,
): QuizScoringMode {
  return settings?.scoringMode === 'ranking' ? 'ranking' : 'performance';
}

export function isPerformanceScoringMode(settings: Pick<RoomSettings, 'scoringMode'>): boolean {
  return resolveScoringMode(settings) === 'performance';
}

export function formatPerformancePoints(points: number): string {
  return Math.round(points).toLocaleString('nb-NO');
}
