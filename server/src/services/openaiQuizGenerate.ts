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
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const prompt = buildAiGeneratePrompt(requestParams);
    const content = await callOpenAi(apiKey, prompt, params.questionStyle);

    const parsed = parseAiQuizJson(content, params.questionStyle);
    if (parsed.errors.length > 0) {
      const isStyleError = parsed.errors.some(
        (e) => e.includes('flervalg') || e.includes('åpne') || e.includes('Blandet'),
      );
      if (isStyleError && attempt < maxAttempts) {
        continue;
      }
      throw new AiQuizGenerateError(
        `AI-svaret kunne ikke valideres: ${parsed.errors[0]}`,
        'INVALID_OUTPUT',
      );
    }

    if (parsed.questions.length !== questionCount) {
      if (attempt < maxAttempts) continue;
      throw new AiQuizGenerateError(
        `AI returnerte ${parsed.questions.length} spørsmål, forventet ${questionCount}. Prøv igjen.`,
        'INVALID_OUTPUT',
      );
    }

    return parsed.questions;
  }

  throw new AiQuizGenerateError('Kunne ikke generere quiz med valgt spørsmålstype.', 'INVALID_OUTPUT');
}

function systemMessageForStyle(style: AiGenerateQuizRequest['questionStyle']): string {
  const base =
    'Du lager quiz-spørsmål for The Quiz Tool. Svar alltid med gyldig JSON på norsk. Følg spørsmålstype-kravene i brukerens melding nøyaktig.';
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
  prompt: string,
  questionStyle: AiGenerateQuizRequest['questionStyle'],
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
        response_format: { type: 'json_object' },
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemMessageForStyle(questionStyle) },
          { role: 'user', content: prompt },
        ],
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
