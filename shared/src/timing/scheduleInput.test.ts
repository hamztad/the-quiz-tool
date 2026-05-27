import { describe, expect, it } from 'vitest';
import {
  armQuizSchedule,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
  validateScheduleInput,
} from './scheduleInput.js';
import { MAX_SCHEDULE_DELAY_MS, MAX_SCHEDULE_DURATION_MS } from './timerConfig.js';

describe('scheduleInput', () => {
  const now = 1_700_000_000_000;

  it('accepts relative delay up to 3 days', () => {
    expect(
      validateScheduleInput({ startDelayMs: MAX_SCHEDULE_DELAY_MS, durationMs: MAX_SCHEDULE_DURATION_MS }, now),
    ).toBeNull();
    expect(validateScheduleInput({ startDelayMs: MAX_SCHEDULE_DELAY_MS + 1 }, now)).toContain('3 døgn');
  });

  it('rejects duration over 24 hours', () => {
    expect(
      validateScheduleInput({ startDelayMs: 0, durationMs: MAX_SCHEDULE_DURATION_MS + 1 }, now),
    ).toContain('24 timer');
  });

  it('arms absolute start and end', () => {
    const startsAt = now + 60 * 60_000;
    const endsAt = startsAt + 30 * 60_000;
    const schedule = armQuizSchedule({ startsAt, endsAt, runMode: 'assisted' }, now, 1);
    expect(schedule.startsAt).toBe(startsAt);
    expect(schedule.endsAt).toBe(endsAt);
  });

  it('rejects start more than 3 days ahead', () => {
    expect(
      validateScheduleInput({ startsAt: now + MAX_SCHEDULE_DELAY_MS + 1 }, now),
    ).toContain('3 døgn');
  });

  it('round-trips datetime-local helpers', () => {
    const ms = fromDatetimeLocalValue('2026-05-27T19:30');
    expect(toDatetimeLocalValue(ms)).toBe('2026-05-27T19:30');
  });
});
