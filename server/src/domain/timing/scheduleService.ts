import {
  armQuizSchedule,
  getFirstQuestionId,
  validateScheduleInput,
  type QuizSchedule,
  type SetScheduleInput,
} from '@quiz-tool/shared';
import type { RoomRecord } from '../../store/RoomStore.js';
import { endQuizForTeams, startQuiz } from '../roomService.js';
import { lockRound, openQuestion } from '../questionService.js';
import { clearAllQuestionTimers } from './questionTimerService.js';

export type { SetScheduleInput };
export { validateScheduleInput };

export function setQuizSchedule(
  room: RoomRecord,
  input: SetScheduleInput,
  now = Date.now(),
): RoomRecord {
  if (room.phase !== 'lobby') {
    throw new Error('Tidsplan kan bare settes før quizen starter.');
  }
  if (room.questions.length === 0) {
    throw new Error('Legg til spørsmål før du planlegger start.');
  }

  const generation = (room.schedule?.generation ?? 0) + 1;
  const schedule = armQuizSchedule(input, now, generation);

  return { ...room, schedule };
}

export function cancelQuizSchedule(room: RoomRecord): RoomRecord {
  if (room.phase !== 'lobby') {
    throw new Error('Tidsplan kan bare avbrytes før quizen starter.');
  }
  return { ...room, schedule: undefined };
}

export function applyScheduledQuizStart(room: RoomRecord, now = Date.now()): RoomRecord {
  if (room.phase !== 'lobby') return room;
  const schedule = room.schedule;
  if (!schedule?.enabled || !schedule.startsAt || schedule.completedAt) return room;
  if (now < schedule.startsAt) return room;

  let next = startQuiz(room);
  next = {
    ...next,
    liveStartedAt: now,
  };

  if (schedule.autoOpenFirstQuestion) {
    const firstId = getFirstQuestionId(next.questions);
    if (firstId) {
      next = openQuestion(next, firstId, { allowWhenTeamsLockedOut: true });
    }
  }

  return next;
}

export function applyScheduledQuizEnd(room: RoomRecord, now = Date.now()): RoomRecord {
  if (room.phase !== 'live' && room.phase !== 'grading' && room.phase !== 'leaderboard') {
    return room;
  }
  const schedule = room.schedule;
  if (!schedule?.enabled || !schedule.endsAt) return room;
  if (schedule.completedAt) return room;
  if (now < schedule.endsAt) return room;

  const questionIds = room.questions.map((q) => q.id);
  let next = lockRound(room, questionIds);
  next = clearAllQuestionTimers(next);
  next = endQuizForTeams(next);
  next = {
    ...next,
    schedule: { ...schedule, completedAt: now },
  };
  return next;
}

export function isScheduleArmed(schedule: QuizSchedule | undefined): boolean {
  return Boolean(schedule?.enabled && schedule.startsAt && !schedule.completedAt);
}
