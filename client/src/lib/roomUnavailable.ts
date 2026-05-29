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
      'Finner ikke quizen på serveren. Den kan ha utløpt, eller serveren kan ha startet på ny. Be quizmaster om ny kode eller prøv igjen senere.',
    icon: 'unavailable',
  },
  ended: {
    title: 'Quizen er avsluttet',
    description: 'Quizmaster har lukket dette rommet permanent. Takk for deltakelsen!',
    icon: 'ended',
  },
  expired: {
    title: 'Quizen er avsluttet',
    description:
      'Tidsplanen for quizen er over, og romdata er ikke lenger tilgjengelig. Be quizmaster om en ny kode hvis dere skal spille igjen.',
    icon: 'unavailable',
  },
  removed: {
    title: 'Deltakeren er fjernet',
    description: 'Quizmaster har fjernet deltakeren fra quizen.',
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
