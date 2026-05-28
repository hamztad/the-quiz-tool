import { getDueDeadlines, type TimerDeadline } from '@quiz-tool/shared';
import type { RoomRecord } from '../../store/RoomStore.js';
import { lockQuestion, openQuestion } from '../questionService.js';
import { applyScheduledQuizEnd, applyScheduledQuizStart } from './scheduleService.js';

export function applyTimerDeadline(
  room: RoomRecord,
  deadline: TimerDeadline,
  now = Date.now(),
): RoomRecord {
  switch (deadline.kind) {
    case 'schedule_start':
      return applyScheduledQuizStart(room, now);
    case 'schedule_end':
      return applyScheduledQuizEnd(room, now);
    case 'question_open': {
      if (!deadline.questionId) return room;
      if (room.questionStatus[deadline.questionId] === 'open') return room;
      return openQuestion(room, deadline.questionId, { allowWhenTeamsLockedOut: true });
    }
    case 'question_interval_close': {
      if (!deadline.questionId) return room;
      if (room.questionStatus[deadline.questionId] !== 'open') return room;
      return lockQuestion(room, deadline.questionId);
    }
    case 'question_lock': {
      if (!deadline.questionId) return room;
      if (room.questionStatus[deadline.questionId] !== 'open') return room;
      return lockQuestion(room, deadline.questionId);
    }
    default:
      return room;
  }
}

export function applyDueDeadlines(room: RoomRecord, now = Date.now()): RoomRecord {
  let current = room;
  const slice = () => ({
    phase: current.phase,
    schedule: current.schedule,
    activeQuestionTimers: current.activeQuestionTimers,
    questionStatus: current.questionStatus,
  });

  for (let safety = 0; safety < 10; safety += 1) {
    const due = getDueDeadlines(slice(), now);
    if (due.length === 0) break;
    const next = applyTimerDeadline(current, due[0]!, now);
    if (next === current) break;
    current = next;
  }
  return current;
}
