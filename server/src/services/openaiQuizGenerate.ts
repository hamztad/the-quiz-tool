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

  const prompt = buildAiGeneratePrompt({ ...params, questionCount, topic });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content:
              'Du lager quiz-spørsmål for The Quiz Tool. Svar alltid med gyldig JSON på norsk.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AiQuizGenerateError('AI-generering tok for lang tid. Prøv igjen.', 'TIMEOUT');
    }
    throw new AiQuizGenerateError('Kunne ikke kontakte OpenAI. Prøv igjen senere.', 'NETWORK');
  } finally {
    clearTimeout(timeout);
  }

  const body = (await response.json()) as OpenAiChatResponse;

  if (!response.ok) {
    const detail = body.error?.message ?? response.statusText;
    throw new AiQuizGenerateError(
      `OpenAI-feil: ${detail}`,
      'OPENAI_ERROR',
    );
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new AiQuizGenerateError('AI returnerte tomt svar.', 'EMPTY_RESPONSE');
  }

  const parsed = parseAiQuizJson(content);
  if (parsed.errors.length > 0) {
    throw new AiQuizGenerateError(
      `AI-svaret kunne ikke valideres: ${parsed.errors[0]}`,
      'INVALID_OUTPUT',
    );
  }

  if (parsed.questions.length !== questionCount) {
    throw new AiQuizGenerateError(
      `AI returnerte ${parsed.questions.length} spørsmål, forventet ${questionCount}. Prøv igjen.`,
      'INVALID_OUTPUT',
    );
  }

  return parsed.questions;
}
