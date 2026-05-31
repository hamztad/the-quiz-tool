import type { TeamEmailNotifyEvent } from '@quiz-tool/shared';
import type { Server } from 'socket.io';
import type { RoomRecord } from '../store/roomStoreTypes.js';
import type { RoomStore } from '../store/roomStoreTypes.js';
import { scheduleTeamResultEmails } from './teamEmailNotifyDispatch.js';

function isQuizEndedTransition(before: RoomRecord, after: RoomRecord): boolean {
  const wasEnded = before.phase === 'post_quiz' || Boolean(before.settings.teamsLockedOut);
  const isEnded = after.phase === 'post_quiz' || Boolean(after.settings.teamsLockedOut);
  return isEnded && !wasEnded;
}

export function notifyTeamEmailTransitions(
  roomStore: RoomStore,
  io: Server,
  roomId: string,
  before: RoomRecord,
  after: RoomRecord,
): void {
  if (isQuizEndedTransition(before, after)) {
    scheduleTeamResultEmails(roomStore, io, roomId, 'quiz_ended');
  }
  if (!before.settings.finalResultLocked && after.settings.finalResultLocked) {
    scheduleTeamResultEmails(roomStore, io, roomId, 'final_result_locked');
  }
}

export function notifyTeamEmailTransitionsIfNeeded(
  roomStore: RoomStore,
  io: Server,
  roomId: string,
  event: TeamEmailNotifyEvent,
): void {
  scheduleTeamResultEmails(roomStore, io, roomId, event);
}
