import {
  resolveQuestionTimerDurationMs,
  type ActiveQuestionTimer,
  type Question,
} from '@quiz-tool/shared';
import type { RoomRecord } from '../../store/RoomStore.js';

function nextTimerGeneration(
  room: RoomRecord,
  questionId: string,
): number {
  const existing = room.activeQuestionTimers[questionId];
  return (existing?.generation ?? 0) + 1;
}

export function armQuestionTimer(
  room: RoomRecord,
  question: Question,
  now = Date.now(),
): RoomRecord {
  const durationMs = resolveQuestionTimerDurationMs(question.timer);
  if (!durationMs) {
    const { [question.id]: _removed, ...rest } = room.activeQuestionTimers;
    return { ...room, activeQuestionTimers: rest };
  }

  const generation = nextTimerGeneration(room, question.id);
  const timer: ActiveQuestionTimer = {
    questionId: question.id,
    openedAt: now,
    endsAt: now + durationMs,
    generation,
    durationMs,
  };

  return {
    ...room,
    activeQuestionTimers: {
      ...room.activeQuestionTimers,
      [question.id]: timer,
    },
  };
}

export function clearQuestionTimer(room: RoomRecord, questionId: string): RoomRecord {
  if (!room.activeQuestionTimers[questionId]) return room;
  const { [questionId]: _removed, ...rest } = room.activeQuestionTimers;
  return { ...room, activeQuestionTimers: rest };
}

export function clearAllQuestionTimers(room: RoomRecord): RoomRecord {
  return { ...room, activeQuestionTimers: {} };
}
