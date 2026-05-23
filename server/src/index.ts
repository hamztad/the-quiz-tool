import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { config } from './config.js';
import { setupSocket } from './socket/index.js';

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
});
