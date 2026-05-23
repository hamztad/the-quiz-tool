import { ROOM_ERROR_CODES, type RoomErrorCode } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/RoomStore.js';

export type RoomAccessResult =
  | { ok: true; room: RoomRecord }
  | { ok: false; code: RoomErrorCode };

export function checkRoomAccess(room: RoomRecord | undefined): RoomAccessResult {
  if (!room) {
    return { ok: false, code: ROOM_ERROR_CODES.ROOM_NOT_FOUND };
  }
  if (room.expiresAt <= Date.now()) {
    return { ok: false, code: ROOM_ERROR_CODES.ROOM_EXPIRED };
  }
  if (room.phase === 'ended') {
    return { ok: false, code: ROOM_ERROR_CODES.ROOM_ENDED };
  }
  return { ok: true, room };
}
