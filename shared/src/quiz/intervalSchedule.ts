import type { Question } from '../types/room.js';
import type { QuestionIntervalWindow, QuizSchedule } from '../types/schedule.js';
import { isIntervalQuiz, normalizeDeliveryMode } from './quizModes.js';

export function buildIntervalWindows(
  questions: Pick<Question, 'id' | 'order'>[],
  startsAt: number,
  endsAt: number,
): QuestionIntervalWindow[] {
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  if (sorted.length === 0 || endsAt <= startsAt) return [];

  const slotMs = (endsAt - startsAt) / sorted.length;
  return sorted.map((q, index) => ({
    questionId: q.id,
    opensAt: Math.round(startsAt + index * slotMs),
    closesAt: Math.round(startsAt + (index + 1) * slotMs),
  }));
}

export function getIntervalWindow(
  schedule: QuizSchedule | undefined,
  questionId: string,
): QuestionIntervalWindow | undefined {
  return schedule?.intervalWindows?.find((w) => w.questionId === questionId);
}

export type IntervalParticipantStatus = 'countdown' | 'open' | 'closed';

export function getIntervalParticipantStatus(
  schedule: QuizSchedule | undefined,
  questionStatus: Record<string, 'locked' | 'open'> | undefined,
  questionId: string,
  now: number,
): IntervalParticipantStatus | null {
  if (!isIntervalQuiz(schedule)) return null;
  const window = getIntervalWindow(schedule, questionId);
  if (!window) return null;
  if (questionStatus?.[questionId] === 'open') return 'open';
  if (now < window.opensAt) return 'countdown';
  return 'closed';
}

export function isIntervalQuestionRevealed(
  schedule: QuizSchedule | undefined,
  questionStatus: Record<string, 'locked' | 'open'> | undefined,
  questionId: string,
  now: number,
): boolean {
  const status = getIntervalParticipantStatus(schedule, questionStatus, questionId, now);
  return status === 'open';
}

export function attachIntervalWindowsToSchedule(
  schedule: QuizSchedule,
  questions: Pick<Question, 'id' | 'order'>[],
): QuizSchedule {
  if (normalizeDeliveryMode(schedule.deliveryMode) !== 'interval') return schedule;
  if (!schedule.startsAt || !schedule.endsAt) return schedule;
  return {
    ...schedule,
    intervalWindows: buildIntervalWindows(questions, schedule.startsAt, schedule.endsAt),
  };
}
