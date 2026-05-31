import type { Question } from '@quiz-tool/shared';
import { questionPromptText } from '@quiz-tool/shared';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 45_000;

export class AiAnswerGradeError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'AiAnswerGradeError';
  }
}

export interface AiGradeModelResult {
  points: number;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

const RESPONSE_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'open_answer_grade',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['points', 'reasoning', 'confidence'],
      properties: {
        points: { type: 'integer', minimum: 0 },
        reasoning: { type: 'string', minLength: 1, maxLength: 500 },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
    },
  },
} as const;

function acceptedAnswersText(question: Question): string {
  const accepted = (question.acceptedAnswers ?? []).map((a) => a.trim()).filter(Boolean);
  if (accepted.length === 0) return '(ingen godkjente svar oppgitt — bruk oppgaveteksten og sunn vurdering)';
  return accepted.join(' · ');
}

function buildGradePrompt(question: Question, participantAnswer: string, maxPoints: number): string {
  const prompt = questionPromptText(question);
  const hint = question.hint?.trim();
  return `Du er en rettferdig quizdommer for et live quiz-show (Gruiz). Vurder spillerens åpne svar.

VIKTIG:
- Sammenlign mening og innhold med godkjente svar og oppgaven — IKKE bare bokstav-for-bokstav.
- Godta synonymer, omformuleringer, små skrivefeil og riktig svar med ekstra ord hvis kjernen er riktig.
- Del ut delpoeng (0 til ${maxPoints}) når svaret er delvis riktig.
- Hvis svaret er helt feil, irrelevant eller tomt i mening: 0 poeng.
- Svar på norsk i "reasoning" (kort, 1–3 setninger).
- Ikke bruk nett — stol på oppgaven og godkjente svar.

Oppgave:
${prompt}
${hint ? `\nHint: ${hint}` : ''}

Godkjente svar (fasit / eksempler — ikke eksklusiv liste hvis annet svar er like riktig):
${acceptedAnswersText(question)}

Maks poeng: ${maxPoints}

Spillerens svar:
${participantAnswer}`;
}

function parseGradeJson(content: string, maxPoints: number): AiGradeModelResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AiAnswerGradeError('KI returnerte ugyldig JSON.', 'INVALID_OUTPUT');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new AiAnswerGradeError('KI returnerte ugyldig format.', 'INVALID_OUTPUT');
  }
  const row = parsed as Record<string, unknown>;
  const points = Math.round(Number(row.points));
  const reasoning = typeof row.reasoning === 'string' ? row.reasoning.trim() : '';
  const confidence = row.confidence;
  if (!Number.isFinite(points) || points < 0 || points > maxPoints) {
    throw new AiAnswerGradeError('KI foreslo ugyldige poeng.', 'INVALID_OUTPUT');
  }
  if (!reasoning) {
    throw new AiAnswerGradeError('KI manglet begrunnelse.', 'INVALID_OUTPUT');
  }
  if (confidence !== 'high' && confidence !== 'medium' && confidence !== 'low') {
    throw new AiAnswerGradeError('KI manglet konfidensnivå.', 'INVALID_OUTPUT');
  }
  return { points, reasoning, confidence };
}

export async function gradeOpenAnswerWithOpenAI(
  apiKey: string,
  question: Question,
  participantAnswer: string,
): Promise<AiGradeModelResult> {
  const maxPoints = question.maxPoints;
  const prompt = buildGradePrompt(question, participantAnswer, maxPoints);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: RESPONSE_SCHEMA,
        messages: [
          {
            role: 'system',
            content:
              'Du retter åpne quizsvar. Returner kun JSON som matcher schema. Vær rettferdig og semantisk, ikke pedantisk på staving.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    const body = (await response.json()) as OpenAiChatResponse;
    if (!response.ok) {
      const detail = body.error?.message ?? response.statusText;
      throw new AiAnswerGradeError(`OpenAI-feil: ${detail}`, 'OPENAI_ERROR');
    }

    const content = body.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      throw new AiAnswerGradeError('KI returnerte tomt svar.', 'EMPTY_RESPONSE');
    }

    return parseGradeJson(content, maxPoints);
  } catch (err) {
    if (err instanceof AiAnswerGradeError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AiAnswerGradeError('KI-retting tok for lang tid.', 'TIMEOUT');
    }
    throw new AiAnswerGradeError('Kunne ikke kontakte OpenAI.', 'NETWORK');
  } finally {
    clearTimeout(timeout);
  }
}
