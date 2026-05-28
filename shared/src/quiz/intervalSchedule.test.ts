import { describe, expect, it } from 'vitest';
import {
  buildIntervalWindows,
  getIntervalParticipantStatus,
} from './intervalSchedule.js';

describe('buildIntervalWindows', () => {
  it('splits quiz duration evenly across questions', () => {
    const windows = buildIntervalWindows(
      [
        { id: 'q1', order: 0 },
        { id: 'q2', order: 1 },
      ],
      0,
      60_000,
    );
    expect(windows).toHaveLength(2);
    expect(windows[0]).toEqual({ questionId: 'q1', opensAt: 0, closesAt: 30_000 });
    expect(windows[1]).toEqual({ questionId: 'q2', opensAt: 30_000, closesAt: 60_000 });
  });
});

describe('getIntervalParticipantStatus', () => {
  const schedule = {
    enabled: true,
    deliveryMode: 'interval' as const,
    runMode: 'manual' as const,
    intervalWindows: buildIntervalWindows([{ id: 'q1', order: 0 }], 0, 60_000),
  };

  it('returns countdown before open', () => {
    const futureSchedule = {
      ...schedule,
      intervalWindows: buildIntervalWindows([{ id: 'q1', order: 0 }], 10_000, 70_000),
    };
    expect(getIntervalParticipantStatus(futureSchedule, { q1: 'locked' }, 'q1', 5000)).toBe(
      'countdown',
    );
  });

  it('returns open when question is open', () => {
    expect(getIntervalParticipantStatus(schedule, { q1: 'open' }, 'q1', 5000)).toBe('open');
  });

  it('returns closed after window when locked', () => {
    expect(getIntervalParticipantStatus(schedule, { q1: 'locked' }, 'q1', 50_000)).toBe(
      'closed',
    );
  });
});
