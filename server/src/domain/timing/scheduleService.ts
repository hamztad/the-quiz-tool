import {
  MAX_SCHEDULE_DELAY_MS,
  MAX_SCHEDULE_DURATION_MS,
  MIN_SCHEDULE_DELAY_MS,
  buildArmedSchedule,
  getFirstQuestionId,
  type QuizRunMode,
  type QuizSchedule,
} from '@quiz-tool/shared';
import type { RoomRecord } from '../../store/RoomStore.js';
import { endQuizForTeams, startQuiz } from '../roomService.js';
import { lockRound, openQuestion } from '../questionService.js';
import { clearAllQuestionTimers } from './questionTimerService.js';

export interface SetScheduleInput {
  startDelayMs: number;
  durationMs?: number;
  runMode?: QuizRunMode;
  autoOpenFirstQuestion?: boolean;
}

export function validateScheduleInput(input: SetScheduleInput): string | null {
  if (input.startDelayMs < MIN_SCHEDULE_DELAY_MS || input.startDelayMs > MAX_SCHEDULE_DELAY_MS) {
    return 'Startforsinkelse må være mellom 0 og 24 timer.';
  }
  if (
    input.durationMs !== undefined &&
    (input.durationMs < 0 || input.durationMs > MAX_SCHEDULE_DURATION_MS)
  ) {
    return 'Varighet må være mellom 0 og 24 timer.';
  }
  return null;
}

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
  const error = validateScheduleInput(input);
  if (error) throw new Error(error);

  const generation = (room.schedule?.generation ?? 0) + 1;
  const runMode = input.runMode ?? 'assisted';
  const schedule = buildArmedSchedule(
    {
      startDelayMs: input.startDelayMs,
      durationMs: input.durationMs,
      runMode,
      autoOpenFirstQuestion:
        input.autoOpenFirstQuestion ?? (runMode === 'assisted'),
    },
    now,
    generation,
  );

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
