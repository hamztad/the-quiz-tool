import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { config } from './config.js';
import { setupSocket } from './socket/index.js';
import { startRoomExpirySweep } from './domain/roomCleanup.js';
import {
  bootstrapScheduledRooms,
  startScheduledRoomSweep,
} from './domain/timing/scheduleBootstrap.js';
import { isRoomPersistenceEnabled } from './store/activeRoomStore.js';
import { flushRoomStore, roomStore } from './store/activeRoomStore.js';
import { PersistingRoomStore } from './store/persistingRoomStore.js';
import { getDefaultRoomDataDir } from './store/roomPersistence.js';

const app = createApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.isProd ? true : config.clientOrigin,
    credentials: true,
  },
});

setupSocket(io);

httpServer.listen(config.port, () => {
  console.log(`The Quiz Tool server on port ${config.port} (${config.nodeEnv})`);
  if (isRoomPersistenceEnabled()) {
    const loaded =
      roomStore instanceof PersistingRoomStore ? roomStore.loadedCount : roomStore.list().length;
    console.log(
      `[rooms] Disk persistence enabled (${getDefaultRoomDataDir()}) — restored ${loaded} active room(s).`,
    );
  } else {
    console.log('[rooms] Disk persistence disabled — room state is in-memory only.');
  }
  bootstrapScheduledRooms();
  startScheduledRoomSweep();
  startRoomExpirySweep();
});

async function shutdown(signal: string) {
  console.log(`[server] ${signal} — flushing room snapshot…`);
  try {
    await flushRoomStore();
  } catch (error) {
    console.error('[rooms] Failed to flush on shutdown:', error);
  }
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
