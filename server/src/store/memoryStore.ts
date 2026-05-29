import { normalizeJoinCodeForMatch } from '@quiz-tool/shared';
import type { RoomRecord, RoomStore } from './roomStoreTypes.js';

export class InMemoryRoomStore implements RoomStore {
  private rooms = new Map<string, RoomRecord>();
  private joinCodeIndex = new Map<string, string>();

  create(room: RoomRecord): void {
    this.rooms.set(room.id, room);
    this.joinCodeIndex.set(normalizeJoinCodeForMatch(room.joinCode), room.id);
  }

  get(roomId: string): RoomRecord | undefined {
    return this.rooms.get(roomId);
  }

  getByJoinCode(joinCode: string): RoomRecord | undefined {
    const roomId = this.joinCodeIndex.get(normalizeJoinCodeForMatch(joinCode));
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  list(): RoomRecord[] {
    return [...this.rooms.values()];
  }

  update(roomId: string, updater: (room: RoomRecord) => RoomRecord): RoomRecord | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const updated = updater(room);
    this.rooms.set(roomId, updated);
    if (normalizeJoinCodeForMatch(updated.joinCode) !== normalizeJoinCodeForMatch(room.joinCode)) {
      this.joinCodeIndex.delete(normalizeJoinCodeForMatch(room.joinCode));
      this.joinCodeIndex.set(normalizeJoinCodeForMatch(updated.joinCode), roomId);
    }
    return updated;
  }

  delete(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.joinCodeIndex.delete(normalizeJoinCodeForMatch(room.joinCode));
    }
    this.rooms.delete(roomId);
  }
}
