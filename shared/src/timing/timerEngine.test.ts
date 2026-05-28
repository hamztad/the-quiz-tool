import { describe, expect, it } from 'vitest';
import {
  buildArmedSchedule,
  getDueDeadlines,
  getNextRoomDeadline,
  remainingMs,
} from './timerEngine.js';
import { attachIntervalWindowsToSchedule } from '../quiz/intervalSchedule.js';

describe('timerEngine', () => {
  it('picks earliest future deadline', () => {
    const now = 1_000_000;
    const deadline = getNextRoomDeadline(
      {
        phase: 'live',
        schedule: buildArmedSchedule(
          { startDelayMs: 0, durationMs: 60_000, runMode: 'assisted' },
          now - 5_000,
          1,
        ),
        activeQuestionTimers: {
          q1: {
            questionId: 'q1',
            openedAt: now,
            endsAt: now + 10_000,
            generation: 1,
            durationMs: 10_000,
          },
        },
        questionStatus: { q1: 'open' },
      },
      now,
    );
    expect(deadline?.kind).toBe('question_lock');
    expect(deadline?.at).toBe(now + 10_000);
  });

  it('returns schedule_start in lobby', () => {
    const now = 5_000;
    const deadline = getNextRoomDeadline(
      {
        phase: 'lobby',
        schedule: {
          enabled: true,
          startsAt: now + 60_000,
          runMode: 'manual',
        },
      },
      now,
    );
    expect(deadline?.kind).toBe('schedule_start');
  });

  it('remainingMs never negative', () => {
    expect(remainingMs(100, 200)).toBe(0);
    expect(remainingMs(500, 100)).toBe(400);
  });

  it('emits interval open and close deadlines in live phase', () => {
    const now = 1_000_000;
    const schedule = attachIntervalWindowsToSchedule(
      buildArmedSchedule(
        { startDelayMs: 0, durationMs: 60_000, runMode: 'manual', deliveryMode: 'interval' },
        now - 5_000,
        1,
        now - 5_000,
        now + 55_000,
      ),
      [{ id: 'q1', order: 0 }],
    );
    const due = getDueDeadlines(
      { phase: 'live', schedule, questionStatus: { q1: 'locked' } },
      now,
    );
    expect(due.some((d) => d.kind === 'question_open' && d.questionId === 'q1')).toBe(true);
  });
});
