import type { PublicRoomState } from '@quiz-tool/shared';
import { getScheduleEndDeadline, getScheduleStartDeadline } from '@quiz-tool/shared';

export function useRoomTimers(room: PublicRoomState | null) {
  const schedule = room?.schedule;
  const serverNow = room?.serverNow;

  const quizStartsAt =
    room?.phase === 'lobby' ? getScheduleStartDeadline(schedule) : null;
  const quizEndsAt =
    room?.phase === 'live' ? getScheduleEndDeadline(schedule) : null;

  const activeQuestionId = room
    ? Object.keys(room.questionStatus).find((id) => room.questionStatus[id] === 'open')
    : undefined;

  const activeQuestionTimer = activeQuestionId
    ? room?.activeQuestionTimers[activeQuestionId]
    : undefined;

  return {
    serverNow,
    quizStartsAt,
    quizEndsAt,
    activeQuestionId,
    activeQuestionTimer,
    scheduleEnabled: Boolean(schedule?.enabled),
    teamsLockedOut: Boolean(room?.settings.teamsLockedOut),
  };
}
