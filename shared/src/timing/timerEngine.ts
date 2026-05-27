import type { ActiveQuestionTimer, QuizSchedule } from '../types/schedule.js';
import type { Question, RoomPhase } from '../types/room.js';

export type TimerDeadlineKind = 'schedule_start' | 'schedule_end' | 'question_lock';

export interface TimerDeadline {
  kind: TimerDeadlineKind;
  at: number;
  questionId?: string;
}

export interface RoomTimerSlice {
  phase: RoomPhase;
  schedule?: QuizSchedule;
  activeQuestionTimers?: Record<string, ActiveQuestionTimer>;
  questionStatus?: Record<string, 'locked' | 'open'>;
}

export function getScheduleStartDeadline(schedule: QuizSchedule | undefined): number | null {
  if (!schedule?.enabled || !schedule.startsAt) return null;
  if (schedule.completedAt) return null;
  return schedule.startsAt;
}

export function getScheduleEndDeadline(schedule: QuizSchedule | undefined): number | null {
  if (!schedule?.enabled || !schedule.endsAt) return null;
  if (schedule.completedAt) return null;
  return schedule.endsAt;
}

export function getQuestionLockDeadlines(
  timers: Record<string, ActiveQuestionTimer> | undefined,
  questionStatus: Record<string, 'locked' | 'open'> | undefined,
): TimerDeadline[] {
  if (!timers) return [];
  const deadlines: TimerDeadline[] = [];
  for (const timer of Object.values(timers)) {
    if (questionStatus?.[timer.questionId] !== 'open') continue;
    deadlines.push({
      kind: 'question_lock',
      at: timer.endsAt,
      questionId: timer.questionId,
    });
  }
  return deadlines;
}

function collectRoomDeadlines(room: RoomTimerSlice): TimerDeadline[] {
  const candidates: TimerDeadline[] = [];

  if (room.phase === 'lobby') {
    const start = getScheduleStartDeadline(room.schedule);
    if (start) {
      candidates.push({ kind: 'schedule_start', at: start });
    }
  }

  if (room.phase === 'live') {
    const end = getScheduleEndDeadline(room.schedule);
    if (end) {
      candidates.push({ kind: 'schedule_end', at: end });
    }
    candidates.push(
      ...getQuestionLockDeadlines(room.activeQuestionTimers, room.questionStatus),
    );
  }

  return candidates;
}

/** Deadlines at or before `now`, oldest first (for server catch-up). */
export function getDueDeadlines(room: RoomTimerSlice, now: number): TimerDeadline[] {
  return collectRoomDeadlines(room)
    .filter((d) => d.at <= now)
    .sort((a, b) => a.at - b.at);
}

export function getNextRoomDeadline(
  room: RoomTimerSlice,
  now: number,
): TimerDeadline | null {
  const candidates = collectRoomDeadlines(room).filter((d) => d.at > now);
  if (candidates.length === 0) return null;
  return candidates.reduce((earliest, current) =>
    current.at < earliest.at ? current : earliest,
  );
}

export function remainingMs(endsAt: number, now: number): number {
  return Math.max(0, endsAt - now);
}

export function isQuestionTimerExpired(
  timer: ActiveQuestionTimer | undefined,
  questionStatus: 'locked' | 'open' | undefined,
  now: number,
): boolean {
  if (!timer || questionStatus !== 'open') return false;
  return now >= timer.endsAt;
}

export function getFirstQuestionId(questions: Pick<Question, 'id' | 'order'>[]): string | null {
  if (questions.length === 0) return null;
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  return sorted[0]?.id ?? null;
}

export function buildArmedSchedule(
  input: {
    startDelayMs: number;
    durationMs?: number;
    runMode: QuizSchedule['runMode'];
    autoOpenFirstQuestion?: boolean;
  },
  now: number,
  generation: number,
  explicitStartsAt?: number,
  explicitEndsAt?: number,
): QuizSchedule {
  const startsAt = explicitStartsAt ?? now + input.startDelayMs;
  const endsAt =
    explicitEndsAt !== undefined
      ? explicitEndsAt
      : input.durationMs && input.durationMs > 0
        ? startsAt + input.durationMs
        : undefined;
  return {
    enabled: true,
    generation,
    armedAt: now,
    startsAt,
    endsAt,
    startDelayMs: input.startDelayMs,
    durationMs: input.durationMs,
    autoOpenFirstQuestion: input.autoOpenFirstQuestion ?? false,
    runMode: input.runMode,
  };
}
