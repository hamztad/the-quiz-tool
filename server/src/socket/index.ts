import type { Server } from 'socket.io';
import { timerCoordinator } from '../domain/timing/TimerCoordinator.js';
import { registerSocketHandlers } from './handlers/index.js';

export function setupSocket(io: Server): void {
  timerCoordinator.bindIo(io);
  io.on('connection', (socket) => {
    registerSocketHandlers(io, socket);

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId as string | undefined;
      if (roomId) {
        // Future: activity log on disconnect
      }
    });
  });
}
