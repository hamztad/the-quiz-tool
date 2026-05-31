import {
  armQuizSchedule,
  computeRoomExpiresAt,
  getFirstQuestionId,
  isSelfPacedQuiz,
  validateScheduleInput,
  type QuizSchedule,
  type SetScheduleInput,
} from '@quiz-tool/shared';
import type { RoomRecord } from '../../store/roomStoreTypes.js';
import { endQuizForTeams, startQuiz } from '../roomService.js';
import { lockRound, openQuestion } from '../questionService.js';
import { applySelfPacedQuizStart } from '../selfPacedService.js';
import { clearAllQuestionTimers } from './questionTimerService.js';
import { logScheduleLifecycle } from './scheduleLifecycleLog.js';

export type { SetScheduleInput };
export { validateScheduleInput };

export function setQuizSchedule(
  room: RoomRecord,
  input: SetScheduleInput,
  now = Date.now(),
): RoomRecord {
  if (room.phase !== 'lobby') {
    throw new Error('Tidsplan kan bare settes før Gruizen starter.');
  }
  if (room.questions.length === 0) {
    throw new Error('Legg til spørsmål før du planlegger start.');
  }

  const generation = (room.schedule?.generation ?? 0) + 1;
  const schedule = armQuizSchedule(input, now, generation, room.questions);
  const expiresAt = computeRoomExpiresAt({ ...room, schedule }, now);

  const next = { ...room, schedule, expiresAt };
  logScheduleLifecycle('schedule_armed', {
    roomId: room.id,
    phase: next.phase,
    schedule: next.schedule,
    expiresAt: next.expiresAt,
    note: isSelfPacedQuiz(schedule) ? 'self_paced' : undefined,
  });
  return next;
}

export function cancelQuizSchedule(room: RoomRecord): RoomRecord {
  if (room.phase !== 'lobby') {
    throw new Error('Tidsplan kan bare avbrytes før Gruizen starter.');
  }
  logScheduleLifecycle('schedule_cancelled', { roomId: room.id, phase: room.phase });
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

  if (isSelfPacedQuiz(schedule)) {
    next = applySelfPacedQuizStart(next);
  } else if (schedule.autoOpenFirstQuestion) {
    const firstId = getFirstQuestionId(next.questions);
    if (firstId) {
      next = openQuestion(next, firstId, { allowWhenTeamsLockedOut: true });
    }
  }

  next = {
    ...next,
    expiresAt: computeRoomExpiresAt(next, now),
  };
  logScheduleLifecycle('schedule_start_applied', {
    roomId: next.id,
    phase: next.phase,
    schedule: next.schedule,
    expiresAt: next.expiresAt,
    note: isSelfPacedQuiz(schedule) ? 'self_paced' : undefined,
  });
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
    expiresAt: computeRoomExpiresAt(
      { ...next, schedule: { ...schedule, completedAt: now } },
      now,
    ),
  };
  logScheduleLifecycle('schedule_end_applied', {
    roomId: next.id,
    phase: next.phase,
    schedule: next.schedule,
    expiresAt: next.expiresAt,
  });
  return next;
}

export function isScheduleArmed(schedule: QuizSchedule | undefined): boolean {
  return Boolean(schedule?.enabled && schedule.startsAt && !schedule.completedAt);
}
