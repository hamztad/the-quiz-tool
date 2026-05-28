import type { RoomState } from '@quiz-tool/shared';

export interface RoomRecord extends RoomState {
  hostToken: string;
  teamTokens: Record<string, string>;
  teamBrowserTokens: Record<string, string>;
  /** Unix ms — room is removed from active use after this time */
  expiresAt: number;
}

export interface RoomStore {
  create(room: RoomRecord): void;
  get(roomId: string): RoomRecord | undefined;
  getByJoinCode(joinCode: string): RoomRecord | undefined;
  list(): RoomRecord[];
  update(roomId: string, updater: (room: RoomRecord) => RoomRecord): RoomRecord | undefined;
  delete(roomId: string): void;
}
