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
  draft: 'Ikke synlig for deltakere ennå — fyll ut og bruk endringene',
  active: 'Deltakere kan svare nå',
  locked: 'Låst for deltakere — du styrer når den åpnes',
};
