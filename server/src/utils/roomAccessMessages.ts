import { formatScheduleClock, ROOM_ERROR_CODES, type RoomErrorCode } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/roomStoreTypes.js';

export function buildRoomAccessDeniedMessage(
  code: RoomErrorCode,
  room?: RoomRecord,
): string {
  switch (code) {
    case ROOM_ERROR_CODES.ROOM_EXPIRED: {
      if (room?.schedule?.endsAt) {
        return `Gruizen er avsluttet. Planlagt slutt var ${formatScheduleClock(room.schedule.endsAt)}. Romdata slettes etter oppbevaringstiden.`;
      }
      if (room?.schedule?.completedAt) {
        return `Gruizen ble avsluttet automatisk ${formatScheduleClock(room.schedule.completedAt)}.`;
      }
      return 'Rommet har utløpt og er ikke lenger tilgjengelig.';
    }
    case ROOM_ERROR_CODES.ROOM_NOT_FOUND:
      return 'Finner ikke Gruizen på serveren. Den kan ha utløpt, eller serveren kan ha startet på ny uten lagret romdata.';
    case ROOM_ERROR_CODES.ROOM_ENDED:
      return 'Gruizmaster har lukket dette rommet permanent.';
    case ROOM_ERROR_CODES.JOIN_CODE_INVALID:
      return 'Romkoden er ugyldig eller Gruizen finnes ikke lenger.';
    case ROOM_ERROR_CODES.SESSION_INVALID:
      return 'Økten din er ugyldig. Prøv å bli med på nytt eller åpne Gruizen som Gruizmaster igjen.';
    default:
      return 'Rommet er ikke tilgjengelig.';
  }
}
