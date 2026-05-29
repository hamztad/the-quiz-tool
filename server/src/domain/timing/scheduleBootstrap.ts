import { isScheduleArmed } from './scheduleService.js';
import { applyDueDeadlines } from './applyTimerDeadline.js';
import { logScheduleLifecycle } from './scheduleLifecycleLog.js';
import { timerCoordinator } from './TimerCoordinator.js';
import { roomStore } from '../../store/activeRoomStore.js';

const SWEEP_INTERVAL_MS = 60_000;

let sweepTimer: ReturnType<typeof setInterval> | null = null;

export function bootstrapScheduledRooms(): void {
  const now = Date.now();
  let armed = 0;

  for (const room of roomStore.list()) {
    if (!room.schedule?.enabled) {
      continue;
    }
    if (!isScheduleArmed(room.schedule) && room.schedule.completedAt) {
      continue;
    }

    const processed = applyDueDeadlines(room, now);
    if (processed !== room) {
      roomStore.update(room.id, () => processed);
      logScheduleLifecycle('schedule_catch_up', {
        roomId: room.id,
        phase: processed.phase,
        schedule: processed.schedule,
        note: `phase ${room.phase} -> ${processed.phase}`,
      });
    }

    timerCoordinator.arm(room.id);
    armed += 1;
    logScheduleLifecycle('schedule_bootstrap', {
      roomId: room.id,
      phase: processed.phase,
      schedule: processed.schedule,
      expiresAt: processed.expiresAt,
    });
  }

  console.log(`[schedule] bootstrap complete armed=${armed} rooms=${roomStore.list().length}`);
}

export function startScheduledRoomSweep(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const room of roomStore.list()) {
      if (!room.schedule?.enabled && room.phase !== 'live') continue;
      const before = room;
      const processed = applyDueDeadlines(room, now);
      if (processed !== before) {
        roomStore.update(room.id, () => processed);
        logScheduleLifecycle('schedule_sweep', {
          roomId: room.id,
          phase: processed.phase,
          schedule: processed.schedule,
          note: `phase ${before.phase} -> ${processed.phase}`,
        });
      }
      const current = roomStore.get(room.id) ?? processed;
      if (current.schedule?.enabled && !current.schedule.completedAt) {
        timerCoordinator.arm(room.id);
      }
    }
  }, SWEEP_INTERVAL_MS);
}
