import { shouldRemoveExpiredRoom, touchRoomActivity } from '@quiz-tool/shared';
import { flushRoomStore, roomStore } from '../store/activeRoomStore.js';
import { syncHostTitleFromQuestions } from './roomService.js';

const SWEEP_INTERVAL_MS = 5 * 60_000;

let sweepTimer: ReturnType<typeof setInterval> | null = null;

export function touchStoredRoom(roomId: string): void {
  roomStore.update(roomId, (room) => touchRoomActivity(syncHostTitleFromQuestions(room)));
}

export function sweepExpiredRooms(now = Date.now()): number {
  let removed = 0;
  for (const room of roomStore.list()) {
    if (!shouldRemoveExpiredRoom(room, now)) continue;
    roomStore.delete(room.id);
    removed += 1;
  }
  if (removed > 0) {
    void flushRoomStore();
  }
  return removed;
}

export function startRoomExpirySweep(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const removed = sweepExpiredRooms();
    if (removed > 0) {
      console.log(`[rooms] removed ${removed} expired room(s)`);
    }
  }, SWEEP_INTERVAL_MS);
}
