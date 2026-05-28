import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { aiQuizRouter } from './routes/aiQuiz.js';
import { gameImagesRouter } from './routes/gameImages.js';
import { initUploadCleanup } from './services/imageProviders/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  initUploadCleanup();

  app.use(
    cors({
      origin: config.isProd ? true : config.clientOrigin,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Host-Token'],
    }),
  );

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'the-quiz-tool' });
  });

  app.use('/api/ai', aiQuizRouter);
  app.use('/api/game-images', gameImagesRouter);

  if (config.isProd) {
    const clientDist = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
