export const ROOM_ERROR_CODES = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_ENDED: 'ROOM_ENDED',
  ROOM_EXPIRED: 'ROOM_EXPIRED',
  JOIN_CODE_INVALID: 'JOIN_CODE_INVALID',
  SESSION_INVALID: 'SESSION_INVALID',
  TEAM_REMOVED: 'TEAM_REMOVED',
  TEAM_JOIN_LOCKED: 'TEAM_JOIN_LOCKED',
} as const;

export type RoomErrorCode = (typeof ROOM_ERROR_CODES)[keyof typeof ROOM_ERROR_CODES];

export interface ServerErrorPayload {
  code: string;
  message: string;
}
