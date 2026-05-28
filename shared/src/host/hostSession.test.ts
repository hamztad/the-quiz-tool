import { describe, expect, it } from 'vitest';
import {
  deriveHostQuizTitle,
  getHostSessionStatusLabel,
  shouldRemoveExpiredRoom,
  touchRoomActivity,
  LIVE_ROOM_ACTIVITY_EXTENSION_MS,
} from './hostSession.js';
import {
  DEFAULT_ROOM_TTL_MS,
  SCHEDULED_ROOM_GRACE_MS,
  computeRoomExpiresAt,
} from '../timing/roomRetention.js';

describe('hostSession', () => {
  it('derives title from first question when no explicit title', () => {
    expect(
      deriveHostQuizTitle('ABCD', [{ lines: [{ text: 'Hovedstad-quiz', style: 'title' }] }]),
    ).toBe('Hovedstad-quiz');
  });

  it('labels lobby as waiting for participants', () => {
    expect(getHostSessionStatusLabel({ phase: 'lobby' })).toBe('Venter på deltakere');
  });

  it('labels armed self-paced schedule as selvgående while live', () => {
    const now = 10_000;
    expect(
      getHostSessionStatusLabel(
        {
          phase: 'live',
          schedule: {
            enabled: true,
            deliveryMode: 'self_paced',
            runMode: 'automatic',
            startsAt: now - 1_000,
            endsAt: now + 60_000,
          },
        },
        now,
      ),
    ).toBe('Selvgående');
  });

  it('extends manual room expiry on activity', () => {
    const now = 1_000_000;
    const room = touchRoomActivity(
      { lastActiveAt: now - 100, expiresAt: now + 1_000 },
      now,
    );
    expect(room.lastActiveAt).toBe(now);
    expect(room.expiresAt).toBe(now + LIVE_ROOM_ACTIVITY_EXTENSION_MS);
  });

  it('keeps scheduled room until end + grace', () => {
    const now = 5_000_000;
    const endsAt = now + 60_000;
    const expiresAt = computeRoomExpiresAt(
      {
        expiresAt: now + 24 * 60 * 60_000,
        schedule: {
          enabled: true,
          deliveryMode: 'self_paced',
          runMode: 'automatic',
          startsAt: now - 1_000,
          endsAt,
        },
      },
      now,
    );
    expect(expiresAt).toBeGreaterThanOrEqual(endsAt + SCHEDULED_ROOM_GRACE_MS);
    expect(expiresAt).toBe(now + DEFAULT_ROOM_TTL_MS);
    expect(
      shouldRemoveExpiredRoom(
        {
          expiresAt,
          phase: 'live',
          schedule: {
            enabled: true,
            deliveryMode: 'self_paced',
            runMode: 'automatic',
            startsAt: now - 1_000,
            endsAt,
          },
        },
        now + DEFAULT_ROOM_TTL_MS - 1,
      ),
    ).toBe(false);
    expect(
      shouldRemoveExpiredRoom(
        {
          expiresAt,
          phase: 'live',
          schedule: {
            enabled: true,
            deliveryMode: 'self_paced',
            runMode: 'automatic',
            startsAt: now - 1_000,
            endsAt,
          },
        },
        expiresAt + 1,
      ),
    ).toBe(true);
  });
});
