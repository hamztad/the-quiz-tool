import { MAX_SCHEDULE_DURATION_MS } from './timerConfig.js';
import type { QuizSchedule } from '../types/schedule.js';

/** Keep scheduled rooms after official end for host review / late joins. */
export const SCHEDULED_ROOM_GRACE_MS = 2 * 60 * 60_000;

/** Default TTL for rooms without a long-running schedule. */
export const DEFAULT_ROOM_TTL_MS = 24 * 60 * 60_000;

/**
 * Room cleanup (in-memory MVP):
 * - Manual/live rooms: expiresAt bumped on activity (see LIVE_ROOM_ACTIVITY_EXTENSION_MS).
 * - Scheduled/self-running: expiresAt = max(default, endsAt + SCHEDULED_ROOM_GRACE_MS).
 * - Ended rooms: removed after expiresAt (grace after post_quiz / ROOM_CLOSE).
 */

export function getScheduledRoomRetentionUntil(
  schedule: QuizSchedule | undefined,
  now = Date.now(),
): number | null {
  if (!schedule?.enabled) return null;

  if (schedule.completedAt) {
    return schedule.completedAt + SCHEDULED_ROOM_GRACE_MS;
  }

  if (schedule.endsAt) {
    return schedule.endsAt + SCHEDULED_ROOM_GRACE_MS;
  }

  if (schedule.startsAt) {
    return schedule.startsAt + MAX_SCHEDULE_DURATION_MS + SCHEDULED_ROOM_GRACE_MS;
  }

  void now;
  return null;
}

export function computeRoomExpiresAt(
  room: { expiresAt: number; schedule?: QuizSchedule },
  now = Date.now(),
): number {
  const retentionUntil = getScheduledRoomRetentionUntil(room.schedule, now);
  const minTtl = now + DEFAULT_ROOM_TTL_MS;
  if (retentionUntil) {
    return Math.max(room.expiresAt, retentionUntil, minTtl);
  }
  return Math.max(room.expiresAt, minTtl);
}

export function isScheduledRoomRetained(
  room: { expiresAt: number; schedule?: QuizSchedule; phase: string },
  now = Date.now(),
): boolean {
  if (room.phase === 'ended') return false;
  const retentionUntil = getScheduledRoomRetentionUntil(room.schedule, now);
  if (!retentionUntil) return false;
  return retentionUntil > now;
}
