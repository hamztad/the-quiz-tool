import { type PublicRoomState, type Question } from '@quiz-tool/shared';
import { isQuestionFrozen } from './gameFreeze';

/** Spilleren har levert minst ett spillforsøk på denne oppgaven. */
export function hasParticipantGameAttempt(
  room: Pick<PublicRoomState, 'gameSubmissions'>,
  teamId: string,
  question: Question,
): boolean {
  if (question.type !== 'game') return false;
  return room.gameSubmissions.some(
    (submission) => submission.questionId === question.id && submission.teamId === teamId,
  );
}

/** Spill som kan forbedres med nytt forsøk mens oppgaven er åpen. */
export function canParticipantRetryGame(
  room: Pick<PublicRoomState, 'questionStatus' | 'activeQuestionTimers' | 'serverNow' | 'gameSubmissions'>,
  teamId: string,
  question: Question,
): boolean {
  if (!hasParticipantGameAttempt(room, teamId, question)) return false;
  if (isQuestionFrozen(room, question.id)) return false;
  const gameId = question.game?.gameId;
  if (!gameId) return false;
  return (
    gameId === 'mathExpression' ||
    gameId === 'dropBall' ||
    gameId === 'rainbowPuzzle' ||
    gameId === 'emojiHunt' ||
    gameId === 'timerChallenge'
  );
}

export function countParticipantGameSubmissions(
  room: Pick<PublicRoomState, 'gameSubmissions'>,
  teamId: string,
  questionId: string,
): number {
  return room.gameSubmissions.filter(
    (submission) => submission.questionId === questionId && submission.teamId === teamId,
  ).length;
}

export function scrollToParticipantGameRetry(): void {
  const target = document.querySelector<HTMLElement>('[data-participant-game-retry]');
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (target instanceof HTMLButtonElement && !target.disabled) {
    window.setTimeout(() => target.focus({ preventScroll: true }), 300);
  }
}
