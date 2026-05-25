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

interface PixabayHit {
  id: number;
  tags?: string;
  previewURL?: string;
  webformatURL?: string;
  largeImageURL?: string;
  pageURL?: string;
  user?: string;
}

interface PixabayResponse {
  hits?: PixabayHit[];
}

function isValidRequest(body: unknown): body is AiGenerateQuizRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  const varietyOk =
    b.varietySeed === undefined ||
    (typeof b.varietySeed === 'string' && b.varietySeed.length <= 120);

  return (
    typeof b.roomId === 'string' &&
    typeof b.topic === 'string' &&
    typeof b.questionCount === 'number' &&
    typeof b.difficulty === 'string' &&
    DIFFICULTIES.has(b.difficulty as AiQuizDifficulty) &&
    typeof b.questionStyle === 'string' &&
    STYLES.has(b.questionStyle as AiQuizQuestionStyle) &&
    varietyOk
  );
}

export const aiQuizRouter = Router();

aiQuizRouter.get('/pixabay-search', async (req, res) => {
  const apiKey = process.env.PIXABAY_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({
      ok: false,
      code: 'MISSING_API_KEY',
      message:
        'Pixabay-søk er ikke konfigurert på serveren (PIXABAY_API_KEY mangler). Du kan fortsatt laste opp bilde lokalt.',
    });
    return;
  }

  const roomId = typeof req.query.roomId === 'string' ? req.query.roomId : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const hostToken = req.header('x-host-token');

  if (!roomId || q.length < 2 || q.length > 80) {
    res.status(400).json({
      ok: false,
      code: 'INVALID_REQUEST',
      message: 'Skriv minst to tegn for å søke etter bilde.',
    });
    return;
  }

  const room = roomStore.get(roomId);
  if (!room || room.hostToken !== hostToken) {
    res.status(403).json({
      ok: false,
      code: 'FORBIDDEN',
      message: 'Ugyldig quizmaster-tilgang.',
    });
    return;
  }

  const params = new URLSearchParams({
    key: apiKey,
    q,
    image_type: 'photo',
    safesearch: 'true',
    per_page: '12',
  });

  try {
    const pixabayRes = await fetch(`https://pixabay.com/api/?${params.toString()}`);
    if (!pixabayRes.ok) {
      res.status(502).json({
        ok: false,
        code: 'PIXABAY_ERROR',
        message: 'Kunne ikke hente bilder fra Pixabay akkurat nå.',
      });
      return;
    }

    const data = (await pixabayRes.json()) as PixabayResponse;
    const results = (data.hits ?? [])
      .filter((hit) => hit.webformatURL || hit.largeImageURL)
      .map((hit) => ({
        id: String(hit.id),
        tags: hit.tags ?? '',
        previewUrl: hit.previewURL ?? hit.webformatURL ?? hit.largeImageURL ?? '',
        imageUrl: hit.webformatURL ?? hit.largeImageURL ?? '',
        pageUrl: hit.pageURL ?? '',
        photographer: hit.user ?? '',
      }));

    res.json({ ok: true, results });
  } catch (err) {
    console.error('Pixabay search error:', err);
    res.status(500).json({
      ok: false,
      code: 'SERVER_ERROR',
      message: 'Noe gikk galt under Pixabay-søk. Prøv igjen.',
    });
  }
});

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
  const { roomId, topic, questionCount, difficulty, questionStyle, varietySeed } = req.body;

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
        varietySeed: typeof varietySeed === 'string' ? varietySeed.trim() : undefined,
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
