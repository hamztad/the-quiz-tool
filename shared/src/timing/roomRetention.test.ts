import { describe, expect, it } from 'vitest';
import {
  SCHEDULED_ROOM_GRACE_MS,
  computeRoomExpiresAt,
  getScheduledRoomRetentionUntil,
  isScheduledRoomRetained,
} from './roomRetention.js';

describe('roomRetention', () => {
  it('extends expiry to schedule end plus grace', () => {
    const now = 1_000_000;
    const endsAt = now + 24 * 60 * 60_000;
    const schedule = {
      enabled: true,
      startsAt: now + 60_000,
      endsAt,
      runMode: 'manual' as const,
    };
    const expiresAt = computeRoomExpiresAt(
      { expiresAt: now + 24 * 60 * 60_000, schedule },
      now,
    );
    expect(expiresAt).toBe(endsAt + SCHEDULED_ROOM_GRACE_MS);
  });

  it('retains room after default expiresAt when schedule is still active', () => {
    const now = 10_000;
    const endsAt = now + 20 * 60 * 60_000;
    const room = {
      expiresAt: now + 60_000,
      phase: 'live' as const,
      schedule: {
        enabled: true,
        startsAt: now - 1_000,
        endsAt,
        runMode: 'manual' as const,
        deliveryMode: 'self_paced' as const,
      },
    };
    expect(isScheduledRoomRetained(room, now + 30 * 60_000)).toBe(true);
    expect(getScheduledRoomRetentionUntil(room.schedule, now)).toBe(
      endsAt + SCHEDULED_ROOM_GRACE_MS,
    );
  });
});
