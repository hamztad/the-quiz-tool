import type { RoomRecord, RoomStore } from './roomStoreTypes.js';
import { InMemoryRoomStore } from './memoryStore.js';
import { getDefaultRoomDataDir, loadRoomsFromDiskSync, saveRoomsToDisk } from './roomPersistence.js';

const PERSIST_DEBOUNCE_MS = 400;

export class PersistingRoomStore implements RoomStore {
  private readonly inner = new InMemoryRoomStore();
  private readonly dataDir: string;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private persistChain: Promise<void> = Promise.resolve();

  constructor(dataDir = getDefaultRoomDataDir()) {
    this.dataDir = dataDir;
    for (const room of loadRoomsFromDiskSync(dataDir)) {
      this.inner.create(room);
    }
  }

  get loadedCount(): number {
    return this.inner.list().length;
  }

  create(room: RoomRecord): void {
    this.inner.create(room);
    this.schedulePersist();
  }

  get(roomId: string): RoomRecord | undefined {
    return this.inner.get(roomId);
  }

  getByJoinCode(joinCode: string): RoomRecord | undefined {
    return this.inner.getByJoinCode(joinCode);
  }

  list(): RoomRecord[] {
    return this.inner.list();
  }

  update(
    roomId: string,
    updater: (room: RoomRecord) => RoomRecord,
  ): RoomRecord | undefined {
    const updated = this.inner.update(roomId, updater);
    if (updated) {
      this.schedulePersist();
    }
    return updated;
  }

  delete(roomId: string): void {
    this.inner.delete(roomId);
    this.schedulePersist();
  }

  schedulePersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.flush();
    }, PERSIST_DEBOUNCE_MS);
  }

  async flush(): Promise<void> {
    const rooms = this.inner.list();
    this.persistChain = this.persistChain.then(() => saveRoomsToDisk(rooms, this.dataDir));
    await this.persistChain;
  }
}
