import {
  buildAiGeneratePrompt,
  clampAiQuestionCount,
  parseAiQuizJson,
  type AiGenerateQuizRequest,
  type ParsedAiQuizQuestion,
} from '@quiz-tool/shared';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 90_000;

export class AiQuizGenerateError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'AiQuizGenerateError';
  }
}

interface OpenAiChatResponse {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string };
}

type OpenAiMessage = { role: 'system' | 'user'; content: string };

function aiQuizResponseFormat() {
  const textField = { type: 'string', minLength: 1, maxLength: 400 };
  const bodyField = {
    anyOf: [
      { type: 'string', maxLength: 400 },
      { type: 'null' },
    ],
  };
  const openQuestion = {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'text', 'body', 'acceptedAnswers'],
    properties: {
      type: { type: 'string', enum: ['open'] },
      text: textField,
      body: bodyField,
      acceptedAnswers: {
        type: 'array',
        minItems: 1,
        maxItems: 5,
        items: { type: 'string', minLength: 1, maxLength: 120 },
      },
    },
  };
  const mcQuestion = {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'text', 'body', 'options'],
    properties: {
      type: { type: 'string', enum: ['mc'] },
      text: textField,
      body: bodyField,
      options: {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['text', 'correct'],
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 120 },
            correct: { type: 'boolean' },
          },
        },
      },
    },
  };

  return {
    type: 'json_schema',
    json_schema: {
      name: 'quiz_tool_ai_quiz',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['questions'],
        properties: {
          questions: {
            type: 'array',
            minItems: 2,
            maxItems: 10,
            items: {
              anyOf: [openQuestion, mcQuestion],
            },
          },
        },
      },
    },
  };
}

function validateGeneratedContent(
  content: string,
  questionStyle: AiGenerateQuizRequest['questionStyle'],
  questionCount: number,
): { ok: true; questions: ParsedAiQuizQuestion[] } | { ok: false; errors: string[] } {
  const parsed = parseAiQuizJson(content, questionStyle);
  const errors = [...parsed.errors];
  if (parsed.errors.length === 0 && parsed.questions.length !== questionCount) {
    errors.push(`AI returnerte ${parsed.questions.length} spørsmål, forventet ${questionCount}.`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, questions: parsed.questions };
}

function truncateForLog(value: string, max = 2000): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function buildRepairPrompt(params: AiGenerateQuizRequest, invalidJson: string, errors: string[]): string {
  const count = clampAiQuestionCount(params.questionCount);
  return `Rett JSON-svaret slik at det passer The Quiz Tool-formatet.

Valideringsfeil:
${errors.map((e) => `- ${e}`).join('\n')}

Krav:
- Returner KUN gyldig JSON, ingen markdown eller forklaring
- Top-level: { "questions": [...] }
- Nøyaktig ${count} spørsmål
- type må følge ønsket spørsmålstype: ${params.questionStyle}
- Open: { "type": "open", "text": "...", "body": null, "acceptedAnswers": ["..."] }
- MC: { "type": "mc", "text": "...", "body": null, "options": [nøyaktig 4 alternativer, nøyaktig én correct true] }
- Ikke inkluder maxPoints; systemet setter 1 poeng
- All tekst skal være på norsk

Ugyldig JSON/svar:
${invalidJson}`;
}

export async function generateQuizWithOpenAI(
  params: AiGenerateQuizRequest,
  apiKey: string,
): Promise<ParsedAiQuizQuestion[]> {
  const questionCount = clampAiQuestionCount(params.questionCount);
  const topic = params.topic.trim();
  if (!topic) {
    throw new AiQuizGenerateError('Tema kan ikke være tomt.', 'INVALID_REQUEST');
  }

  const requestParams = { ...params, questionCount, topic };
  const prompt = buildAiGeneratePrompt(requestParams);
  const initialContent = await callOpenAi(
    apiKey,
    [
      { role: 'system', content: systemMessageForStyle(params.questionStyle) },
      { role: 'user', content: prompt },
    ],
    0.45,
  );

  const initial = validateGeneratedContent(initialContent, params.questionStyle, questionCount);
  if (initial.ok) {
    return initial.questions;
  }

  console.warn('AI quiz validation failed, attempting repair:', {
    errors: initial.errors,
    raw: truncateForLog(initialContent),
  });

  const repairPrompt = buildRepairPrompt(requestParams, initialContent, initial.errors);
  const repairedContent = await callOpenAi(
    apiKey,
    [
      { role: 'system', content: systemMessageForStyle(params.questionStyle) },
      { role: 'user', content: repairPrompt },
    ],
    0.1,
  );

  const repaired = validateGeneratedContent(repairedContent, params.questionStyle, questionCount);
  if (repaired.ok) {
    return repaired.questions;
  }

  console.warn('AI quiz repair validation failed:', {
    errors: repaired.errors,
    raw: truncateForLog(repairedContent),
  });
  throw new AiQuizGenerateError(
    'AI laget et svar i feil format. Prøv igjen, eller velg færre spørsmål.',
    'INVALID_OUTPUT',
  );
}

function systemMessageForStyle(style: AiGenerateQuizRequest['questionStyle']): string {
  const base =
    'Du lager quiz-spørsmål for The Quiz Tool. Svar alltid med gyldig JSON på norsk. Følg spørsmålstype-kravene i brukerens melding nøyaktig. Hver forespørsel skal gi nye, unike spørsmål — ikke gjenta standard pubquiz-klisjeer.';
  if (style === 'open') {
    return `${base} Alle spørsmål skal ha type "open" — aldri "mc".`;
  }
  if (style === 'mc') {
    return `${base} Alle spørsmål skal ha type "mc" — aldri "open".`;
  }
  return `${base} Quizen skal blande type "open" og "mc" som angitt.`;
}

async function callOpenAi(
  apiKey: string,
  messages: OpenAiMessage[],
  temperature: number,
): Promise<string> {
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
        response_format: aiQuizResponseFormat(),
        temperature,
        messages,
      }),
      signal: controller.signal,
    });

    const body = (await response.json()) as OpenAiChatResponse;

    if (!response.ok) {
      const detail = body.error?.message ?? response.statusText;
      throw new AiQuizGenerateError(`OpenAI-feil: ${detail}`, 'OPENAI_ERROR');
    }

    const content = body.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      throw new AiQuizGenerateError('AI returnerte tomt svar.', 'EMPTY_RESPONSE');
    }

    return content;
  } catch (err) {
    if (err instanceof AiQuizGenerateError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AiQuizGenerateError('AI-generering tok for lang tid. Prøv igjen.', 'TIMEOUT');
    }
    throw new AiQuizGenerateError('Kunne ikke kontakte OpenAI. Prøv igjen senere.', 'NETWORK');
  } finally {
    clearTimeout(timeout);
  }
}
