import type { RoomRecord } from '../store/RoomStore.js';
import { calculateGameQuestionResults, calculateGameResultsForQuestions, startGameRound } from './gameService.js';

export function openQuestion(room: RoomRecord, questionId: string): RoomRecord {
  if (!room.questions.find((q) => q.id === questionId)) {
    throw new Error('Spørsmål finnes ikke.');
  }
  const opened = {
    ...room,
    questionStatus: { ...room.questionStatus, [questionId]: 'open' as const },
    questionsActivated: { ...room.questionsActivated, [questionId]: true },
  };
  return startGameRound(opened, questionId);
}

export function lockQuestion(room: RoomRecord, questionId: string): RoomRecord {
  if (!room.questions.find((q) => q.id === questionId)) {
    throw new Error('Spørsmål finnes ikke.');
  }
  const locked = {
    ...room,
    questionStatus: { ...room.questionStatus, [questionId]: 'locked' as const },
  };
  return calculateGameQuestionResults(locked, questionId);
}

export function lockRound(room: RoomRecord, questionIds: string[]): RoomRecord {
  const status = { ...room.questionStatus };
  for (const id of questionIds) {
    if (status[id] !== undefined) {
      status[id] = 'locked';
    }
  }
  return calculateGameResultsForQuestions({ ...room, questionStatus: status }, questionIds);
}
