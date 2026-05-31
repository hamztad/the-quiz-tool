import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import {
  type AiGenerateQuizRequest,
  type AiImageProvider,
  type AiQuizDifficulty,
  type AiShopMode,
  type AiShopSlot,
  type GameId,
  type ParsedAiQuizQuestion,
  builtInGames,
} from '@quiz-tool/shared';
import { roomStore } from '../store/activeRoomStore.js';
import { AiQuizGenerateError, generateQuizWithOpenAI } from '../services/openaiQuizGenerate.js';
import {
  getUploadedImageMetadata,
  providerResultToMedia,
  searchImagesByProvider,
  storeUploadedImage,
  type ImageProviderId,
} from '../services/imageProviders/index.js';

const DIFFICULTIES = new Set<AiQuizDifficulty>(['easy', 'medium', 'hard']);
const MODES = new Set<AiShopMode>(['instant', 'cart', 'regnerace']);
const BUILTIN_GAME_IDS = new Set(builtInGames.map((g) => g.id));
const SLOT_TYPES = new Set(['open', 'mc', 'ordering', 'game']);

function isValidSlot(raw: unknown): raw is AiShopSlot {
  if (!raw || typeof raw !== 'object') return false;
  const s = raw as Record<string, unknown>;
  if (!SLOT_TYPES.has(s.type as string)) return false;
  if (s.type === 'game') {
    return typeof s.gameId === 'string' && BUILTIN_GAME_IDS.has(s.gameId as GameId);
  }
  if (s.orderingItemCount !== undefined) {
    const c = Number(s.orderingItemCount);
    if (!Number.isInteger(c) || c < 2 || c > 5) return false;
  }
  if (s.topic !== undefined && typeof s.topic !== 'string') return false;
  return s.gameId === undefined;
}
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TRANSLATE_MODEL = 'gpt-4o-mini';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1_000_000 } });

interface OpenAiTranslateResponse {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
}

async function translateNorwegianImageQuery(
  query: string,
  apiKey: string,
): Promise<string | null> {
  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_TRANSLATE_MODEL,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'Translate short Norwegian image search queries to concise English keywords for Pixabay. Return only the translated query, no quotes or explanation.',
        },
        { role: 'user', content: query },
      ],
    }),
  });

  if (!response.ok) return null;
  const body = (await response.json()) as OpenAiTranslateResponse;
  const translated = body.choices?.[0]?.message?.content?.trim();
  if (!translated) return null;
  return translated.replace(/^["']|["']$/g, '').slice(0, 80);
}

function questionTextForImageSearch(question: ParsedAiQuizQuestion): string {
  const title = question.lines[0]?.text ?? '';
  const correct =
    question.type === 'mc'
      ? question.options?.find((o) => o.isCorrect)?.text
      : question.acceptedAnswers?.[0];
  return [title, correct].filter(Boolean).join(' ');
}

async function attachProviderImagesToQuestions(
  questions: ParsedAiQuizQuestion[],
  provider: ImageProviderId,
  pixabayApiKey: string | undefined,
  openAiApiKey: string,
): Promise<ParsedAiQuizQuestion[]> {
  if (provider === 'pixabay' && !pixabayApiKey) {
    console.warn('AI image attachment skipped: PIXABAY_API_KEY missing.');
    return questions;
  }

  return Promise.all(
    questions.map(async (question) => {
      try {
        const norwegianQuery = questionTextForImageSearch(question).slice(0, 80);
        if (norwegianQuery.length < 2) return question;

        const translated = await translateNorwegianImageQuery(norwegianQuery, openAiApiKey);
        const searchQuery = translated || norwegianQuery;
        const { results } = await searchImagesByProvider(
          provider,
          searchQuery,
          1,
          pixabayApiKey,
        );
        const first = results[0];
        if (!first) return question;
        return { ...question, media: [providerResultToMedia(provider, first)] };
      } catch (err) {
        console.warn('AI image attachment skipped for one question:', err);
        return question;
      }
    }),
  );
}

function isValidRequest(body: unknown): body is AiGenerateQuizRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  const varietyOk =
    b.varietySeed === undefined ||
    (typeof b.varietySeed === 'string' && b.varietySeed.length <= 120);

  if (
    typeof b.roomId !== 'string' ||
    typeof b.topic !== 'string' ||
    typeof b.questionCount !== 'number' ||
    typeof b.difficulty !== 'string' ||
    !DIFFICULTIES.has(b.difficulty as AiQuizDifficulty) ||
    typeof b.mode !== 'string' ||
    !MODES.has(b.mode as AiShopMode) ||
    (b.includePixabayImages !== undefined && typeof b.includePixabayImages !== 'boolean') ||
    (b.imageProvider !== undefined &&
      b.imageProvider !== 'pixabay' &&
      b.imageProvider !== 'wikimedia' &&
      b.imageProvider !== 'upload') ||
    !varietyOk
  ) {
    return false;
  }

  if (b.mode === 'cart') {
    if (!Array.isArray(b.slots) || b.slots.length < 2 || b.slots.length > 10) return false;
    if (!b.slots.every(isValidSlot)) return false;
    if (b.slots.length !== Math.round(b.questionCount)) return false;
  }

  return true;
}

export const aiQuizRouter = Router();

async function handleImageSearch(
  req: Request,
  res: Response,
  forcedProvider?: ImageProviderId,
) {
  const pixabayApiKey = process.env.PIXABAY_API_KEY?.trim();
  const roomId = typeof req.query.roomId === 'string' ? req.query.roomId : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const language = req.query.language === 'nb' ? 'nb' : 'en';
  const requestedProvider =
    forcedProvider ??
    (req.query.provider === 'wikimedia' ? 'wikimedia' : 'pixabay');
  const provider = requestedProvider as ImageProviderId;
  const page = Math.max(1, Math.min(Number(req.query.page) || 1, 50));
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
  if (!room) {
    res.status(404).json({
      ok: false,
      code: 'ROOM_NOT_FOUND',
      message:
        'Gruizen finnes ikke på serveren (kan ha blitt nullstilt). Last siden på nytt eller opprett Gruizen på nytt.',
    });
    return;
  }

  if (!hostToken || room.hostToken !== hostToken) {
    res.status(403).json({
      ok: false,
      code: 'FORBIDDEN',
      message: 'Ugyldig Gruizmaster-tilgang. Last siden på nytt for å koble til Gruizen igjen.',
    });
    return;
  }

  try {
    let searchQuery = q;
    let translatedQuery: string | undefined;
    let notice: string | undefined;

    if (language === 'nb') {
      const openAiKey = process.env.OPENAI_API_KEY?.trim();
      if (openAiKey) {
        try {
          const translated = await translateNorwegianImageQuery(q, openAiKey);
          if (translated) {
            searchQuery = translated;
            translatedQuery = translated;
          } else {
            notice = 'Kunne ikke oversette akkurat nå, så vi søkte med originalteksten.';
          }
        } catch (translateErr) {
          console.warn('Image query translation failed:', translateErr);
          notice = 'Oversetting feilet, så vi søkte med originalteksten.';
        }
      } else {
        notice = 'OpenAI-oversetting er ikke konfigurert, så vi søkte med originalteksten.';
      }
    }

    if (provider === 'pixabay' && !pixabayApiKey) {
      res.status(503).json({
        ok: false,
        code: 'MISSING_API_KEY',
        message:
          'Pixabay-søk er ikke konfigurert på serveren (PIXABAY_API_KEY mangler). Kontakt administrator.',
      });
      return;
    }
    const { results, hasMore } = await searchImagesByProvider(
      provider,
      searchQuery,
      page,
      pixabayApiKey,
    );
    res.json({
      ok: true,
      provider,
      results,
      query: q,
      translatedQuery,
      notice,
      page,
      hasMore,
    });
  } catch (err) {
    console.error('Image search error:', err);
    const detail = err instanceof Error ? err.message : '';
    res.status(500).json({
      ok: false,
      code: 'SERVER_ERROR',
      message:
        detail ||
        (provider === 'wikimedia'
          ? 'Noe gikk galt under Wikimedia-søk. Prøv igjen.'
          : 'Noe gikk galt under Pixabay-søk. Prøv igjen.'),
    });
  }
}

aiQuizRouter.get('/image-search', async (req, res) => {
  await handleImageSearch(req, res);
});

aiQuizRouter.get('/pixabay-search', async (req, res) => {
  await handleImageSearch(req, res, 'pixabay');
});

aiQuizRouter.post('/upload-image', (req, res) => {
  upload.single('image')(req, res, async (uploadError) => {
    if (uploadError) {
      res.status(400).json({
        ok: false,
        code: 'UPLOAD_FAILED',
        message:
          uploadError instanceof Error && uploadError.message.includes('File too large')
            ? 'Image must be smaller than 1 MB.'
            : 'Kunne ikke laste opp bilde. Sjekk filtype og størrelse.',
      });
      return;
    }

    const roomId = typeof req.body?.roomId === 'string' ? req.body.roomId : '';
    const hostToken = req.header('x-host-token') || '';
    const confirmOwnership = req.body?.confirmOwnership === 'true';
    const file = req.file;

    if (!roomId || !file) {
      res.status(400).json({
        ok: false,
        code: 'INVALID_REQUEST',
        message: 'Velg et bilde før opplasting.',
      });
      return;
    }

    try {
      const stored = await storeUploadedImage({
        roomId,
        hostToken,
        fileBuffer: file.buffer,
        mimeType: file.mimetype,
        originalFilename: file.originalname,
        confirmOwnership,
        requestIp: req.ip,
      });

      res.json({
        ok: true,
        result: {
          id: stored.imageId,
          title: stored.filename,
          tags: 'Privat opplasting',
          previewUrl: stored.thumbUrlPath,
          imageUrl: stored.imageUrlPath,
          pageUrl: '',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kunne ikke laste opp bilde.';
      const status = message.includes('Gruizmaster-tilgang')
        ? 403
        : message.includes('smaller than 1 MB') || message.includes('tillatt')
          ? 400
          : 500;
      res.status(status).json({
        ok: false,
        code: 'UPLOAD_FAILED',
        message,
      });
    }
  });
});

aiQuizRouter.get('/uploaded-images/:imageId', async (req, res) => {
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

  const useThumb = req.query.thumb === '1';
  res.setHeader('Content-Type', meta.mimeType);
  res.setHeader('Cache-Control', 'private, max-age=600');
  res.sendFile(useThumb ? meta.thumbPath : meta.imagePath);
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
  const {
    roomId,
    topic,
    questionCount,
    difficulty,
    mode,
    slots,
    includePixabayImages,
    imageProvider,
    varietySeed,
  } = req.body;

  const room = roomStore.get(roomId);
  if (!room || room.hostToken !== hostToken) {
    res.status(403).json({
      ok: false,
      code: 'FORBIDDEN',
      message: 'Ugyldig Gruizmaster-tilgang.',
    });
    return;
  }

  if (room.phase !== 'lobby' && room.phase !== 'post_quiz') {
    res.status(400).json({
      ok: false,
      code: 'INVALID_PHASE',
      message: 'AI-generering er kun tilgjengelig mens Gruizen bygges (ikke under live Gruiz).',
    });
    return;
  }

  try {
    let questions = await generateQuizWithOpenAI(
      {
        roomId,
        mode,
        topic: topic.trim(),
        questionCount,
        difficulty,
        slots: mode === 'cart' ? slots : undefined,
        includePixabayImages,
        imageProvider,
        varietySeed: typeof varietySeed === 'string' ? varietySeed.trim() : undefined,
      },
      apiKey,
    );

    const shouldAttachImages = Boolean(includePixabayImages);
    const provider: ImageProviderId = (imageProvider as AiImageProvider | undefined) ?? 'pixabay';
    if (shouldAttachImages) {
      if (provider === 'upload') {
        res.status(400).json({
          ok: false,
          code: 'INVALID_PROVIDER',
          message: 'Privat opplasting brukes manuelt i editoren, ikke i automatisk AI-bildesøk.',
        });
        return;
      }
      questions = await attachProviderImagesToQuestions(
        questions,
        provider,
        process.env.PIXABAY_API_KEY?.trim(),
        apiKey,
      );
    }

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
