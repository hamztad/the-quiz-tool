import { ROOM_ERROR_CODES, type ServerErrorPayload } from '@quiz-tool/shared';

export type RoomUnavailableReason = 'not_found' | 'ended' | 'expired' | 'removed';

export interface RoomUnavailableContent {
  title: string;
  description: string;
  icon: 'unavailable' | 'ended';
}

const ROOM_UNAVAILABLE_COPY: Record<RoomUnavailableReason, RoomUnavailableContent> = {
  not_found: {
    title: 'Quizrommet er ikke tilgjengelig',
    description:
      'Finner ikke Gruizen på serveren. Den kan ha utløpt, eller serveren kan ha startet på ny. Be Gruizmaster om ny kode eller prøv igjen senere.',
    icon: 'unavailable',
  },
  ended: {
    title: 'Gruizen er avsluttet',
    description: 'Gruizmaster har lukket dette rommet permanent. Takk for deltakelsen!',
    icon: 'ended',
  },
  expired: {
    title: 'Gruizen er avsluttet',
    description:
      'Tidsplanen for Gruizen er over, og romdata er ikke lenger tilgjengelig. Be Gruizmaster om en ny kode hvis dere skal spille igjen.',
    icon: 'unavailable',
  },
  removed: {
    title: 'Deltakeren er fjernet',
    description: 'Gruizmaster har fjernet deltakeren fra Gruizen.',
    icon: 'unavailable',
  },
};

export function getRoomUnavailableContent(reason: RoomUnavailableReason): RoomUnavailableContent {
  return ROOM_UNAVAILABLE_COPY[reason];
}

export function parseRoomUnavailableReason(
  error: ServerErrorPayload | null | undefined,
): RoomUnavailableReason | null {
  if (!error) return null;

  switch (error.code) {
    case ROOM_ERROR_CODES.ROOM_ENDED:
      return 'ended';
    case ROOM_ERROR_CODES.ROOM_EXPIRED:
      return 'expired';
    case ROOM_ERROR_CODES.ROOM_NOT_FOUND:
    case ROOM_ERROR_CODES.JOIN_CODE_INVALID:
    case ROOM_ERROR_CODES.SESSION_INVALID:
      return 'not_found';
    case ROOM_ERROR_CODES.TEAM_REMOVED:
      return 'removed';
    default:
      return null;
  }
}

export function isRoomUnavailableError(error: ServerErrorPayload | null | undefined): boolean {
  return parseRoomUnavailableReason(error) !== null;
}
