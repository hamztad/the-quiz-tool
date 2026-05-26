import { Router } from 'express';
import {
  clampAiQuestionCount,
  type AiGenerateQuizRequest,
  type AiQuizDifficulty,
  type AiQuizQuestionStyle,
  type MediaAttachment,
  type ParsedAiQuizQuestion,
} from '@quiz-tool/shared';
import { roomStore } from '../store/memoryStore.js';
import { AiQuizGenerateError, generateQuizWithOpenAI } from '../services/openaiQuizGenerate.js';

const DIFFICULTIES = new Set<AiQuizDifficulty>(['easy', 'medium', 'hard']);
const STYLES = new Set<AiQuizQuestionStyle>(['open', 'mc', 'mixed', 'quizPackage']);
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_TRANSLATE_MODEL = 'gpt-4o-mini';

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
  totalHits?: number;
}

interface PixabayImageResult {
  id: string;
  tags: string;
  previewUrl: string;
  imageUrl: string;
  pageUrl: string;
  photographer: string;
}

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

async function searchPixabayImages(
  apiKey: string,
  query: string,
  page = 1,
): Promise<{ results: PixabayImageResult[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    image_type: 'photo',
    safesearch: 'true',
    per_page: '12',
    page: String(page),
  });

  const pixabayRes = await fetch(`https://pixabay.com/api/?${params.toString()}`);
  if (!pixabayRes.ok) {
    throw new Error(`Pixabay-feil: ${pixabayRes.status}`);
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

  return { results, hasMore: page * 12 < (data.totalHits ?? 0) };
}

function questionTextForImageSearch(question: ParsedAiQuizQuestion): string {
  const title = question.lines[0]?.text ?? '';
  const correct =
    question.type === 'mc'
      ? question.options?.find((o) => o.isCorrect)?.text
      : question.acceptedAnswers?.[0];
  return [title, correct].filter(Boolean).join(' ');
}

function mediaFromPixabayResult(result: PixabayImageResult): MediaAttachment {
  return {
    type: 'image',
    url: result.imageUrl,
    previewUrl: result.previewUrl,
    alt: result.tags,
    source: 'pixabay',
    photographer: result.photographer,
    pageUrl: result.pageUrl,
  };
}

async function attachPixabayImagesToQuestions(
  questions: ParsedAiQuizQuestion[],
  pixabayApiKey: string | undefined,
  openAiApiKey: string,
): Promise<ParsedAiQuizQuestion[]> {
  if (!pixabayApiKey) {
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
        const { results } = await searchPixabayImages(pixabayApiKey, searchQuery, 1);
        const first = results[0];
        if (!first) return question;
        return { ...question, media: [mediaFromPixabayResult(first)] };
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

  return (
    typeof b.roomId === 'string' &&
    typeof b.topic === 'string' &&
    typeof b.questionCount === 'number' &&
    typeof b.difficulty === 'string' &&
    DIFFICULTIES.has(b.difficulty as AiQuizDifficulty) &&
    typeof b.questionStyle === 'string' &&
    STYLES.has(b.questionStyle as AiQuizQuestionStyle) &&
    (b.includePixabayImages === undefined || typeof b.includePixabayImages === 'boolean') &&
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
        'Pixabay-søk er ikke konfigurert på serveren (PIXABAY_API_KEY mangler). Kontakt administrator.',
    });
    return;
  }

  const roomId = typeof req.query.roomId === 'string' ? req.query.roomId : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const language = req.query.language === 'nb' ? 'nb' : 'en';
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
  if (!room || room.hostToken !== hostToken) {
    res.status(403).json({
      ok: false,
      code: 'FORBIDDEN',
      message: 'Ugyldig quizmaster-tilgang.',
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
        const translated = await translateNorwegianImageQuery(q, openAiKey);
        if (translated) {
          searchQuery = translated;
          translatedQuery = translated;
        } else {
          notice = 'Kunne ikke oversette akkurat nå, så vi søkte med originalteksten.';
        }
      } else {
        notice = 'OpenAI-oversetting er ikke konfigurert, så vi søkte med originalteksten.';
      }
    }

    const { results, hasMore } = await searchPixabayImages(apiKey, searchQuery, page);
    res.json({
      ok: true,
      results,
      query: q,
      translatedQuery,
      notice,
      page,
      hasMore,
    });
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
  const {
    roomId,
    topic,
    questionCount,
    difficulty,
    questionStyle,
    includePixabayImages,
    varietySeed,
  } = req.body;

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
    let questions = await generateQuizWithOpenAI(
      {
        roomId,
        topic: topic.trim(),
        questionCount: questionStyle === 'quizPackage' ? 5 : clampAiQuestionCount(questionCount),
        difficulty,
        questionStyle,
        includePixabayImages,
        varietySeed: typeof varietySeed === 'string' ? varietySeed.trim() : undefined,
      },
      apiKey,
    );

    if (includePixabayImages) {
      questions = await attachPixabayImagesToQuestions(
        questions,
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
