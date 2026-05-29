import type { Server, Socket } from 'socket.io';
import { SERVER_EVENTS } from '@quiz-tool/shared';
import { touchStoredRoom } from '../domain/roomCleanup.js';
import { syncHostTitleFromQuestions } from '../domain/roomService.js';
import { touchRoomActivity } from '@quiz-tool/shared';
import { applyDueDeadlines } from '../domain/timing/applyTimerDeadline.js';
import { timerCoordinator } from '../domain/timing/TimerCoordinator.js';
import { toPublicState } from '../domain/roomService.js';
import { roomStore } from '../store/activeRoomStore.js';

export function emitRoomStateToAll(io: Server, roomId: string): void {
  const room = roomStore.get(roomId);
  if (!room) return;

  const sockets = io.sockets.adapter.rooms.get(roomId);
  if (!sockets) return;

  for (const socketId of sockets) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      emitRoomStateToSocket(socket, roomId);
    }
  }
}

/** Apply due timers, broadcast state, and arm the next server deadline. */
export function publishRoomState(io: Server, roomId: string): void {
  const room = roomStore.get(roomId);
  if (!room) return;

  const now = Date.now();
  roomStore.update(roomId, (current) => {
    const withDeadlines = applyDueDeadlines(current, now);
    return touchRoomActivity(syncHostTitleFromQuestions(withDeadlines), now);
  });

  emitRoomStateToAll(io, roomId);
  timerCoordinator.arm(roomId);
}

export function emitRoomStateToSocket(socket: Socket, roomId: string): void {
  const room = roomStore.get(roomId);
  if (!room) return;

  const role = socket.data.role as 'host' | 'secretary' | undefined;
  if (!role) return;

  const publicState = toPublicState(room, role, socket.data.teamId as string | undefined);
  socket.emit(SERVER_EVENTS.ROOM_STATE, publicState);
}
