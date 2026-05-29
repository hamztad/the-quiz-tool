import type { RoomStore } from './roomStoreTypes.js';
import { InMemoryRoomStore } from './memoryStore.js';
import { PersistingRoomStore } from './persistingRoomStore.js';
import { getDefaultRoomDataDir } from './roomPersistence.js';

export function isRoomPersistenceEnabled(): boolean {
  if (process.env.QUIZ_DISABLE_ROOM_PERSISTENCE === '1') return false;
  if (process.env.VITEST) return false;
  return true;
}

export function createRoomStore(): RoomStore {
  if (!isRoomPersistenceEnabled()) {
    return new InMemoryRoomStore();
  }
  return new PersistingRoomStore(getDefaultRoomDataDir());
}

export const roomStore = createRoomStore();

export async function flushRoomStore(): Promise<void> {
  if (roomStore instanceof PersistingRoomStore) {
    await roomStore.flush();
  }
}
