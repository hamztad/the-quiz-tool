import {
  ROOM_ERROR_CODES,
  computeRoomExpiresAt,
  type RoomErrorCode,
} from '@quiz-tool/shared';
import type { RoomRecord } from '../store/RoomStore.js';

export type RoomAccessResult =
  | { ok: true; room: RoomRecord }
  | { ok: false; code: RoomErrorCode };

export function getEffectiveRoomExpiresAt(room: RoomRecord, now = Date.now()): number {
  return computeRoomExpiresAt(room, now);
}

export function checkRoomAccess(room: RoomRecord | undefined, now = Date.now()): RoomAccessResult {
  if (!room) {
    return { ok: false, code: ROOM_ERROR_CODES.ROOM_NOT_FOUND };
  }
  if (getEffectiveRoomExpiresAt(room, now) <= now) {
    return { ok: false, code: ROOM_ERROR_CODES.ROOM_EXPIRED };
  }
  if (room.phase === 'ended') {
    return { ok: false, code: ROOM_ERROR_CODES.ROOM_ENDED };
  }
  return { ok: true, room };
}
