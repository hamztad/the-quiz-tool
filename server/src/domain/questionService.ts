import type { RoomRecord } from '../store/RoomStore.js';
import { calculateGameQuestionResults, calculateGameResultsForQuestions, startGameRound } from './gameService.js';
import { armQuestionTimer, clearQuestionTimer } from './timing/questionTimerService.js';

export interface OpenQuestionOptions {
  allowWhenTeamsLockedOut?: boolean;
}

function assertCanOpenQuestion(room: RoomRecord, options?: OpenQuestionOptions): void {
  if (room.settings.teamsLockedOut && !options?.allowWhenTeamsLockedOut) {
    throw new Error(
      'Quizen er avsluttet for deltakere. Bruk «Tving åpne» for å åpne spørsmål igjen.',
    );
  }
  if (room.settings.finalResultLocked) {
    throw new Error('Endelig resultat er låst.');
  }
}

export function openQuestion(
  room: RoomRecord,
  questionId: string,
  options?: OpenQuestionOptions,
): RoomRecord {
  const question = room.questions.find((q) => q.id === questionId);
  if (!question) {
    throw new Error('Spørsmål finnes ikke.');
  }
  assertCanOpenQuestion(room, options);

  let opened: RoomRecord = {
    ...room,
    questionStatus: { ...room.questionStatus, [questionId]: 'open' as const },
    questionsActivated: { ...room.questionsActivated, [questionId]: true },
  };
  opened = startGameRound(opened, questionId);
  opened = armQuestionTimer(opened, question);
  return opened;
}

export function lockQuestion(room: RoomRecord, questionId: string): RoomRecord {
  if (!room.questions.find((q) => q.id === questionId)) {
    throw new Error('Spørsmål finnes ikke.');
  }
  let locked: RoomRecord = {
    ...room,
    questionStatus: { ...room.questionStatus, [questionId]: 'locked' as const },
  };
  locked = clearQuestionTimer(locked, questionId);
  return calculateGameQuestionResults(locked, questionId);
}

export function lockRound(room: RoomRecord, questionIds: string[]): RoomRecord {
  const status = { ...room.questionStatus };
  for (const id of questionIds) {
    if (status[id] !== undefined) {
      status[id] = 'locked';
    }
  }
  let next: RoomRecord = { ...room, questionStatus: status };
  for (const id of questionIds) {
    next = clearQuestionTimer(next, id);
  }
  return calculateGameResultsForQuestions(next, questionIds);
}

export function forceReopenQuestion(room: RoomRecord, questionId: string): RoomRecord {
  return openQuestion(
    { ...room, settings: { ...room.settings, teamsLockedOut: false } },
    questionId,
    { allowWhenTeamsLockedOut: true },
  );
}
