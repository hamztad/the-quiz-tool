import { Router } from 'express';
import { buildHostRoomSummary, checkHostReconnectAccess } from '../domain/hostRoomAccess.js';
import { roomStore } from '../store/activeRoomStore.js';
import { buildRoomAccessDeniedMessage } from '../utils/roomAccessMessages.js';

export const hostSessionRouter = Router();

hostSessionRouter.get('/session-summary', (req, res) => {
  const roomId = typeof req.query.roomId === 'string' ? req.query.roomId : '';
  const hostToken = req.header('x-host-token') ?? '';

  if (!roomId) {
    res.status(400).json({ ok: false, message: 'Mangler quiz-id.' });
    return;
  }

  const room = roomStore.get(roomId);
  const access = checkHostReconnectAccess(room, hostToken);
  if (!access.ok) {
    res.status(access.code === 'SESSION_INVALID' ? 403 : 404).json({
      ok: false,
      code: access.code,
      message: buildRoomAccessDeniedMessage(access.code, room),
    });
    return;
  }

  res.json({
    ok: true,
    summary: buildHostRoomSummary(access.room),
  });
});
