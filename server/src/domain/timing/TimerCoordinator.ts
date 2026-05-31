import { getNextRoomDeadline } from '@quiz-tool/shared';
import type { Server } from 'socket.io';
import { notifyTeamEmailTransitions } from '../teamEmailNotifyTransitions.js';
import { emitRoomStateToAll } from '../../socket/emitRoomState.js';
import { roomStore } from '../../store/activeRoomStore.js';
import { applyDueDeadlines } from './applyTimerDeadline.js';

export class TimerCoordinator {
  private timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private io: Server | null = null;

  bindIo(io: Server): void {
    this.io = io;
  }

  arm(roomId: string): void {
    this.disarm(roomId);
    const room = roomStore.get(roomId);
    if (!room) return;

    const deadline = getNextRoomDeadline(
      {
        phase: room.phase,
        schedule: room.schedule,
        activeQuestionTimers: room.activeQuestionTimers,
        questionStatus: room.questionStatus,
      },
      Date.now(),
    );

    if (!deadline) return;

    const delay = Math.max(0, deadline.at - Date.now());
    const timeout = setTimeout(() => {
      this.timeouts.delete(roomId);
      this.onTimeout(roomId, deadline.at);
    }, delay);
    this.timeouts.set(roomId, timeout);
  }

  private onTimeout(roomId: string, expectedAt: number): void {
    const room = roomStore.get(roomId);
    if (!room) return;

    const now = Date.now();
    if (now + 50 < expectedAt) {
      this.arm(roomId);
      return;
    }

    const prev = room;
    let next = applyDueDeadlines(room, now);
    if (next !== prev) {
      roomStore.update(roomId, () => next);
      if (this.io) {
        notifyTeamEmailTransitions(roomStore, this.io, roomId, prev, next);
      }
    }

    if (this.io) {
      emitRoomStateToAll(this.io, roomId);
    }
    this.arm(roomId);
  }

  disarm(roomId: string): void {
    const timeout = this.timeouts.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(roomId);
    }
  }

  disarmAll(): void {
    for (const roomId of this.timeouts.keys()) {
      this.disarm(roomId);
    }
  }
}

export const timerCoordinator = new TimerCoordinator();
