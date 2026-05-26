import type { Question } from '@quiz-tool/shared';

interface HostDraftSession {
  questions: Question[];
  updatedAt: number;
  exportedHash?: string;
}

const PREFIX = 'quiztool:host-draft:';

function key(roomId: string): string {
  return `${PREFIX}${roomId}`;
}

export function quizContentHash(questions: Question[]): string {
  return JSON.stringify(questions);
}

export function readHostDraftSession(roomId: string): HostDraftSession | null {
  try {
    const raw = localStorage.getItem(key(roomId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HostDraftSession>;
    if (!Array.isArray(parsed.questions) || typeof parsed.updatedAt !== 'number') return null;
    return {
      questions: parsed.questions as Question[],
      updatedAt: parsed.updatedAt,
      exportedHash: typeof parsed.exportedHash === 'string' ? parsed.exportedHash : undefined,
    };
  } catch {
    return null;
  }
}

export function writeHostDraftSession(
  roomId: string,
  questions: Question[],
  exportedHash?: string,
): void {
  const payload: HostDraftSession = {
    questions,
    updatedAt: Date.now(),
    ...(exportedHash ? { exportedHash } : {}),
  };
  localStorage.setItem(key(roomId), JSON.stringify(payload));
}

export function markHostDraftExported(roomId: string, questions: Question[]): void {
  writeHostDraftSession(roomId, questions, quizContentHash(questions));
}
