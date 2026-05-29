import { ROOM_ERROR_CODES, type HostRoomSummary, type RoomErrorCode } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/roomStoreTypes.js';
import { getEffectiveRoomExpiresAt } from './roomAccess.js';
import { deriveHostQuizTitle } from '@quiz-tool/shared';

export type HostRoomAccessResult =
  | { ok: true; room: RoomRecord }
  | { ok: false; code: RoomErrorCode };

/** Host may reconnect to review ended quizzes until the room expires. */
export function checkHostReconnectAccess(
  room: RoomRecord | undefined,
  hostToken: string | undefined,
  now = Date.now(),
): HostRoomAccessResult {
  if (!room) {
    return { ok: false, code: ROOM_ERROR_CODES.ROOM_NOT_FOUND };
  }
  if (!hostToken || hostToken !== room.hostToken) {
    return { ok: false, code: ROOM_ERROR_CODES.SESSION_INVALID };
  }
  if (getEffectiveRoomExpiresAt(room, now) <= now) {
    return { ok: false, code: ROOM_ERROR_CODES.ROOM_EXPIRED };
  }
  return { ok: true, room };
}

export function buildHostRoomSummary(room: RoomRecord): HostRoomSummary {
  return {
    roomId: room.id,
    joinCode: room.joinCode,
    title: room.hostTitle ?? deriveHostQuizTitle(room.joinCode, room.questions, room.hostTitle),
    phase: room.phase,
    createdAt: room.createdAt,
    lastActiveAt: room.lastActiveAt,
    hostConnected: room.hostPresence.connected,
    schedule: room.schedule
      ? {
          enabled: room.schedule.enabled,
          deliveryMode: room.schedule.deliveryMode,
          runMode: room.schedule.runMode,
          startsAt: room.schedule.startsAt,
          endsAt: room.schedule.endsAt,
          completedAt: room.schedule.completedAt,
        }
      : undefined,
    teamCount: room.teams.length,
    questionCount: room.questions.length,
  };
}
