import type { PublicRoomState, Question, QuestionStatus } from '@quiz-tool/shared';
import { isQuestionIncomplete } from './questionFactory';

export type HostQuestionDisplayStatus = 'draft' | 'active' | 'locked';

export function getHostQuestionDisplayStatus(
  room: PublicRoomState,
  question: Question,
  runtimeStatus: QuestionStatus = 'locked',
): HostQuestionDisplayStatus {
  if (room.phase === 'lobby' || isQuestionIncomplete(question)) {
    return 'draft';
  }
  if (runtimeStatus === 'open') {
    return 'active';
  }
  return 'locked';
}

export const hostStatusLabels: Record<HostQuestionDisplayStatus, string> = {
  draft: 'Utkast',
  active: 'Aktiv',
  locked: 'Låst',
};

export const hostStatusDescriptions: Record<HostQuestionDisplayStatus, string> = {
  draft: 'Ikke synlig for lag ennå — fyll ut og lagre',
  active: 'Lag kan svare nå',
  locked: 'Låst for lag — du styrer når den åpnes',
};
