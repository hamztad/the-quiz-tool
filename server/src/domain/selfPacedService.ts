import { isSelfPacedQuiz } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/RoomStore.js';
import { openQuestion } from './questionService.js';

export function lockQuestionForTeam(
  room: RoomRecord,
  teamId: string,
  questionId: string,
): RoomRecord {
  const current = room.teamQuestionLocks?.[teamId] ?? [];
  if (current.includes(questionId)) return room;
  return {
    ...room,
    teamQuestionLocks: {
      ...room.teamQuestionLocks,
      [teamId]: [...current, questionId],
    },
  };
}

export function openAllQuestionsForSelfPaced(room: RoomRecord): RoomRecord {
  let next = room;
  for (const q of room.questions) {
    next = openQuestion(next, q.id, { allowWhenTeamsLockedOut: true });
  }
  return next;
}

export function applySelfPacedQuizStart(room: RoomRecord): RoomRecord {
  if (!isSelfPacedQuiz(room.schedule)) return room;
  return openAllQuestionsForSelfPaced(room);
}
