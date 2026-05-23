import type { RoomRecord } from '../store/RoomStore.js';

export function openQuestion(room: RoomRecord, questionId: string): RoomRecord {
  if (!room.questions.find((q) => q.id === questionId)) {
    throw new Error('Spørsmål finnes ikke.');
  }
  return {
    ...room,
    questionStatus: { ...room.questionStatus, [questionId]: 'open' },
    questionsActivated: { ...room.questionsActivated, [questionId]: true },
  };
}

export function lockQuestion(room: RoomRecord, questionId: string): RoomRecord {
  if (!room.questions.find((q) => q.id === questionId)) {
    throw new Error('Spørsmål finnes ikke.');
  }
  return {
    ...room,
    questionStatus: { ...room.questionStatus, [questionId]: 'locked' },
  };
}

export function lockRound(room: RoomRecord, questionIds: string[]): RoomRecord {
  const status = { ...room.questionStatus };
  for (const id of questionIds) {
    if (status[id] !== undefined) {
      status[id] = 'locked';
    }
  }
  return { ...room, questionStatus: status };
}
