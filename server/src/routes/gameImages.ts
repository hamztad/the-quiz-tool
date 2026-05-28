import { Router } from 'express';
import { isQuestionRevealedToTeam } from '@quiz-tool/shared';
import { roomStore } from '../store/memoryStore.js';
import { getUploadedImageMetadata } from '../services/imageProviders/upload.js';
import { resolveGameplayImage } from '../services/gameplayImage.js';

export const gameImagesRouter = Router();

function teamIdFromBearer(room: { teamTokens: Record<string, string> }, header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;
  const entry = Object.entries(room.teamTokens).find(([, value]) => value === token);
  return entry?.[0] ?? null;
}

function hostTokenValid(room: { hostToken: string }, header: string | undefined): boolean {
  if (!header?.startsWith('Bearer ')) return false;
  return header.slice('Bearer '.length).trim() === room.hostToken;
}

gameImagesRouter.get('/play/:roomId/:questionId', async (req, res) => {
  const roomId = String(req.params.roomId || '').trim();
  const questionId = String(req.params.questionId || '').trim();
  const room = roomStore.get(roomId);
  if (!room) {
    res.status(404).end();
    return;
  }

  const teamId = teamIdFromBearer(room, req.header('authorization'));
  if (!teamId) {
    res.status(403).json({ ok: false, message: 'Ingen tilgang til spillbildet.' });
    return;
  }

  const question = room.questions.find((item) => item.id === questionId);
  if (!question || question.type !== 'game' || question.game?.gameId !== 'revealImage') {
    res.status(404).end();
    return;
  }

  if (!isQuestionRevealedToTeam(room, questionId)) {
    res.status(403).json({ ok: false, message: 'Spørsmålet er ikke tilgjengelig ennå.' });
    return;
  }

  try {
    const { buffer, mimeType } = await resolveGameplayImage(roomId, question);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(buffer);
  } catch {
    res.status(404).end();
  }
});

gameImagesRouter.get('/:imageId', async (req, res) => {
  const imageId = String(req.params.imageId || '').trim();
  if (!imageId) {
    res.status(404).end();
    return;
  }
  const meta = await getUploadedImageMetadata(imageId);
  if (!meta) {
    res.status(404).end();
    return;
  }

  const room = roomStore.get(meta.roomId);
  const authHeader = req.header('authorization');
  const teamOk = room && teamIdFromBearer(room, authHeader);
  const hostOk = room && hostTokenValid(room, authHeader);
  const useThumb = req.query.thumb === '1';
  if (!teamOk && !hostOk) {
    res.status(403).json({ ok: false, message: 'Ingen tilgang til bildet.' });
    return;
  }

  const filePath = useThumb ? meta.thumbPath : meta.gameplayPath ?? meta.imagePath;
  res.setHeader('Content-Type', meta.mimeType);
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(filePath);
});
