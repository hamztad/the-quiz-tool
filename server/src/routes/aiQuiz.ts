import { Router } from 'express';
import {
  clampAiQuestionCount,
  type AiGenerateQuizRequest,
  type AiQuizDifficulty,
  type AiQuizQuestionStyle,
} from '@quiz-tool/shared';
import { roomStore } from '../store/memoryStore.js';
import { AiQuizGenerateError, generateQuizWithOpenAI } from '../services/openaiQuizGenerate.js';

const DIFFICULTIES = new Set<AiQuizDifficulty>(['easy', 'medium', 'hard']);
const STYLES = new Set<AiQuizQuestionStyle>(['open', 'mc', 'mixed']);

function isValidRequest(body: unknown): body is AiGenerateQuizRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.roomId === 'string' &&
    typeof b.topic === 'string' &&
    typeof b.questionCount === 'number' &&
    typeof b.difficulty === 'string' &&
    DIFFICULTIES.has(b.difficulty as AiQuizDifficulty) &&
    typeof b.questionStyle === 'string' &&
    STYLES.has(b.questionStyle as AiQuizQuestionStyle)
  );
}

export const aiQuizRouter = Router();

aiQuizRouter.post('/generate-quiz', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({
      ok: false,
      code: 'MISSING_API_KEY',
      message:
        'AI-generering er ikke konfigurert på serveren (OPENAI_API_KEY mangler). Kontakt administrator eller bruk Tekst-import.',
    });
    return;
  }

  if (!isValidRequest(req.body)) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_REQUEST',
      message: 'Ugyldig forespørsel om AI-generering.',
    });
    return;
  }

  const hostToken = req.header('x-host-token');
  const { roomId, topic, questionCount, difficulty, questionStyle } = req.body;

  const room = roomStore.get(roomId);
  if (!room || room.hostToken !== hostToken) {
    res.status(403).json({
      ok: false,
      code: 'FORBIDDEN',
      message: 'Ugyldig quizmaster-tilgang.',
    });
    return;
  }

  if (room.phase !== 'lobby' && room.phase !== 'post_quiz') {
    res.status(400).json({
      ok: false,
      code: 'INVALID_PHASE',
      message: 'AI-generering er kun tilgjengelig mens quizen bygges (ikke under live quiz).',
    });
    return;
  }

  try {
    const questions = await generateQuizWithOpenAI(
      {
        roomId,
        topic: topic.trim(),
        questionCount: clampAiQuestionCount(questionCount),
        difficulty,
        questionStyle,
      },
      apiKey,
    );

    res.json({ ok: true, questions });
  } catch (err) {
    if (err instanceof AiQuizGenerateError) {
      const status = err.code === 'INVALID_OUTPUT' || err.code === 'INVALID_REQUEST' ? 422 : 502;
      res.status(status).json({ ok: false, code: err.code, message: err.message });
      return;
    }
    console.error('AI quiz generate error:', err);
    res.status(500).json({
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Noe gikk galt under AI-generering. Prøv igjen.',
    });
  }
});
