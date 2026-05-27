import type { PublicRoomState } from '@quiz-tool/shared';
import { isQuestionTimerExpired } from '@quiz-tool/shared';

export function isQuestionFrozen(
  room: Pick<PublicRoomState, 'questionStatus' | 'activeQuestionTimers' | 'serverNow'>,
  questionId: string,
  now = Date.now(),
): boolean {
  if (room.questionStatus[questionId] !== 'open') return true;
  const skew = room.serverNow ? room.serverNow - Date.now() : 0;
  const adjustedNow = now + skew;
  const timer = room.activeQuestionTimers[questionId];
  return isQuestionTimerExpired(timer, 'open', adjustedNow);
}
