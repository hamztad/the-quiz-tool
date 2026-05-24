import type {
  AiGenerateQuizErrorResponse,
  AiGenerateQuizRequest,
  AiGenerateQuizResponse,
} from '@quiz-tool/shared';
import type { HostSession } from './tokens';

export async function requestAiQuizGeneration(
  session: HostSession,
  params: Omit<AiGenerateQuizRequest, 'roomId'>,
): Promise<AiGenerateQuizResponse> {
  const res = await fetch('/api/ai/generate-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Host-Token': session.hostToken,
    },
    body: JSON.stringify({
      roomId: session.roomId,
      ...params,
    }),
  });

  const data = (await res.json()) as AiGenerateQuizResponse | AiGenerateQuizErrorResponse;

  if (!res.ok || !data.ok) {
    const message =
      !data.ok && 'message' in data
        ? data.message
        : 'Kunne ikke generere quiz med AI.';
    throw new Error(message);
  }

  return data;
}
