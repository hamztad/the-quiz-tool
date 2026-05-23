import type { RoomState } from '@quiz-tool/shared';

export interface RoomRecord extends RoomState {
  hostToken: string;
  teamTokens: Record<string, string>;
}

export interface RoomStore {
  create(room: RoomRecord): void;
  get(roomId: string): RoomRecord | undefined;
  getByJoinCode(joinCode: string): RoomRecord | undefined;
  update(roomId: string, updater: (room: RoomRecord) => RoomRecord): RoomRecord | undefined;
  delete(roomId: string): void;
}
