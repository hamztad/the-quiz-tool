import type { QuestionTimerConfig } from '../types/schedule.js';

export const TIMER_PRESET_MS: Record<NonNullable<QuestionTimerConfig['preset']>, number> = {
  '10s': 10_000,
  '30s': 30_000,
  '1m': 60_000,
  '5m': 300_000,
};

export const MIN_QUESTION_TIMER_MS = 5_000;
export const MAX_QUESTION_TIMER_MS = 60 * 60_000;

export const MIN_SCHEDULE_DELAY_MS = 0;
export const MAX_SCHEDULE_DELAY_MS = 24 * 60 * 60_000;
export const MAX_SCHEDULE_DURATION_MS = 24 * 60 * 60_000;

export function resolveQuestionTimerDurationMs(
  timer: QuestionTimerConfig | undefined,
): number | null {
  if (!timer || timer.mode === 'none') return null;
  if (timer.mode === 'preset' && timer.preset) {
    return TIMER_PRESET_MS[timer.preset] ?? null;
  }
  if (timer.mode === 'custom' && typeof timer.customMs === 'number') {
    const ms = Math.round(timer.customMs);
    if (ms < MIN_QUESTION_TIMER_MS || ms > MAX_QUESTION_TIMER_MS) return null;
    return ms;
  }
  return null;
}

export function isValidQuestionTimerConfig(timer: unknown): timer is QuestionTimerConfig {
  if (!timer || typeof timer !== 'object') return false;
  const t = timer as QuestionTimerConfig;
  if (t.mode === 'none') return true;
  if (t.mode === 'preset') {
    return t.preset === '10s' || t.preset === '30s' || t.preset === '1m' || t.preset === '5m';
  }
  if (t.mode === 'custom') {
    return (
      typeof t.customMs === 'number' &&
      t.customMs >= MIN_QUESTION_TIMER_MS &&
      t.customMs <= MAX_QUESTION_TIMER_MS
    );
  }
  return false;
}

export function normalizeQuestionTimerConfig(
  timer: QuestionTimerConfig | undefined,
): QuestionTimerConfig | undefined {
  if (!timer || timer.mode === 'none') return undefined;
  if (timer.mode === 'preset' && timer.preset && TIMER_PRESET_MS[timer.preset]) {
    return { mode: 'preset', preset: timer.preset };
  }
  if (timer.mode === 'custom' && typeof timer.customMs === 'number') {
    const ms = Math.min(MAX_QUESTION_TIMER_MS, Math.max(MIN_QUESTION_TIMER_MS, Math.round(timer.customMs)));
    return { mode: 'custom', customMs: ms };
  }
  return undefined;
}
