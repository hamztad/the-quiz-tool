import {
  buildAiGeneratePrompt,
  builtInGames,
  parseAiQuizJson,
  resolveAiGeneration,
  type AiGenerateQuizRequest,
  type AiShopSlot,
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

const textField = { type: 'string', minLength: 1, maxLength: 400 };
const bodyField = {
  anyOf: [{ type: 'string', maxLength: 400 }, { type: 'null' }],
};

const openQuestionSchema = {
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

const mcQuestionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'text', 'body', 'options'],
  properties: {
    type: { type: 'string', enum: ['mc', 'multipleChoice'] },
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

const orderingQuestionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'type',
    'text',
    'body',
    'directionLabel',
    'directionLabelTop',
    'directionLabelBottom',
    'items',
    'correctOrder',
  ],
  properties: {
    type: { type: 'string', enum: ['ordering'] },
    text: textField,
    body: bodyField,
    directionLabel: { type: 'string', minLength: 1, maxLength: 120 },
    directionLabelTop: { type: 'string', minLength: 1, maxLength: 80 },
    directionLabelBottom: { type: 'string', minLength: 1, maxLength: 80 },
    items: {
      type: 'array',
      minItems: 2,
      maxItems: 5,
      items: { type: 'string', minLength: 1, maxLength: 80 },
    },
    correctOrder: {
      type: 'array',
      minItems: 2,
      maxItems: 5,
      items: { type: 'string', minLength: 1, maxLength: 80 },
    },
  },
};

const puzzleQuestionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'type',
    'puzzleType',
    'text',
    'body',
    'answerText',
    'anagramKind',
    'anagramEvidence',
    'expressions',
  ],
  properties: {
    type: { type: 'string', enum: ['puzzle'] },
    puzzleType: { type: 'string', enum: ['mathRace'] },
    text: textField,
    body: bodyField,
    answerText: { type: 'string', maxLength: 80 },
    anagramKind: {
      type: 'string',
      enum: ['commonWord', 'properNoun', 'establishedPhrase'],
    },
    anagramEvidence: { type: 'string', maxLength: 180 },
    expressions: {
      type: 'array',
      minItems: 0,
      maxItems: 6,
      items: { type: 'string', minLength: 1, maxLength: 40 },
    },
  },
};

const registryGameIds = builtInGames.map((g) => g.id);

const gameQuestionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'gameId', 'text', 'body'],
  properties: {
    type: { type: 'string', enum: ['game'] },
    gameId: { type: 'string', enum: registryGameIds },
    text: textField,
    body: bodyField,
  },
};

function aiQuizResponseFormat(slots: AiShopSlot[]) {
  const count = slots.length;
  const anyOfSchemas = [
    openQuestionSchema,
    mcQuestionSchema,
    orderingQuestionSchema,
    puzzleQuestionSchema,
    gameQuestionSchema,
  ];

  return {
    type: 'json_schema',
    json_schema: {
      name: 'gruiz_ai_shop',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['questions'],
        properties: {
          questions: {
            type: 'array',
            minItems: count,
            maxItems: count,
            items: { anyOf: anyOfSchemas },
          },
        },
      },
    },
  };
}

function validateGeneratedContent(
  content: string,
  slots: AiShopSlot[],
): { ok: true; questions: ParsedAiQuizQuestion[] } | { ok: false; errors: string[] } {
  const parsed = parseAiQuizJson(content, undefined, slots);
  const errors = [...parsed.errors];
  if (parsed.errors.length === 0 && parsed.questions.length !== slots.length) {
    errors.push(`AI returnerte ${parsed.questions.length} oppgaver, forventet ${slots.length}.`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, questions: parsed.questions };
}

function truncateForLog(value: string, max = 2000): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function buildRepairPrompt(
  params: AiGenerateQuizRequest,
  slots: AiShopSlot[],
  invalidJson: string,
  errors: string[],
): string {
  const slotLines = slots
    .map((slot, i) => {
      const label =
        slot.type === 'game' ? `game gameId ${slot.gameId}` : slot.type;
      return `  ${i + 1}. ${label}`;
    })
    .join('\n');
  return `Rett JSON-svaret slik at det passer Gruiz AI-shop-formatet.

Valideringsfeil:
${errors.map((e) => `- ${e}`).join('\n')}

Krav:
- Returner KUN gyldig JSON
- Top-level: { "questions": [...] }
- Nøyaktig ${slots.length} oppgaver i rekkefølgen:
${slotLines}
- Rekkefølge: items og correctOrder må være konsistente og faktisk riktige
- Ikke inkluder maxPoints

Ugyldig JSON/svar:
${invalidJson}`;
}

export async function generateQuizWithOpenAI(
  params: AiGenerateQuizRequest,
  apiKey: string,
): Promise<ParsedAiQuizQuestion[]> {
  const resolved = resolveAiGeneration(params);
  if (!resolved.ok) {
    throw new AiQuizGenerateError(resolved.errors.join(' '), 'INVALID_REQUEST');
  }
  const { topic, questionCount, slots } = resolved.resolved;
  if (!topic.trim()) {
    throw new AiQuizGenerateError('Tema kan ikke være tomt.', 'INVALID_REQUEST');
  }

  const requestParams: AiGenerateQuizRequest = {
    ...params,
    mode: resolved.resolved.mode,
    topic,
    questionCount,
    slots,
  };
  const prompt = buildAiGeneratePrompt(requestParams);
  const initialContent = await callOpenAi(
    apiKey,
    [
      { role: 'system', content: systemMessageForSlots(slots) },
      { role: 'user', content: prompt },
    ],
    0.45,
    slots,
  );

  const initial = validateGeneratedContent(initialContent, slots);
  if (initial.ok) {
    return initial.questions;
  }

  console.warn('AI Gruiz validation failed, attempting repair:', {
    errors: initial.errors,
    raw: truncateForLog(initialContent),
  });

  const repairPrompt = buildRepairPrompt(requestParams, slots, initialContent, initial.errors);
  const repairedContent = await callOpenAi(
    apiKey,
    [
      { role: 'system', content: systemMessageForSlots(slots) },
      { role: 'user', content: repairPrompt },
    ],
    0.1,
    slots,
  );

  const repaired = validateGeneratedContent(repairedContent, slots);
  if (repaired.ok) {
    return repaired.questions;
  }

  console.warn('AI Gruiz repair validation failed:', {
    errors: repaired.errors,
    raw: truncateForLog(repairedContent),
  });
  throw new AiQuizGenerateError(
    'AI laget et svar i feil format. Prøv igjen, eller velg færre oppgaver.',
    'INVALID_OUTPUT',
  );
}

function systemMessageForSlots(slots: AiShopSlot[]): string {
  const hasOrdering = slots.some((s) => s.type === 'ordering');
  const orderingNote = hasOrdering
    ? ' For rekkefølge: correctOrder må være objektivt korrekt (f.eks. størst til minst).'
    : '';
  return `Du lager oppgaver til Gruiz (The Quiz Tool). Svar alltid med gyldig JSON på norsk. Følg slot-rekkefølgen nøyaktig. Unike, varierte oppgaver.${orderingNote}`;
}

async function callOpenAi(
  apiKey: string,
  messages: OpenAiMessage[],
  temperature: number,
  slots: AiShopSlot[],
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
        response_format: aiQuizResponseFormat(slots),
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
