import { normalizeJoinCode } from '@quiz-tool/shared';
import type { RoomRecord, RoomStore } from './RoomStore.js';

class InMemoryRoomStore implements RoomStore {
  private rooms = new Map<string, RoomRecord>();
  private joinCodeIndex = new Map<string, string>();

  create(room: RoomRecord): void {
    this.rooms.set(room.id, room);
    this.joinCodeIndex.set(normalizeJoinCode(room.joinCode), room.id);
  }

  get(roomId: string): RoomRecord | undefined {
    return this.rooms.get(roomId);
  }

  getByJoinCode(joinCode: string): RoomRecord | undefined {
    const roomId = this.joinCodeIndex.get(normalizeJoinCode(joinCode));
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  update(roomId: string, updater: (room: RoomRecord) => RoomRecord): RoomRecord | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const updated = updater(room);
    this.rooms.set(roomId, updated);
    return updated;
  }

  delete(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.joinCodeIndex.delete(normalizeJoinCode(room.joinCode));
    }
    this.rooms.delete(roomId);
  }
}

export const roomStore = new InMemoryRoomStore();
