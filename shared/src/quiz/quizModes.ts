import type { Question, RoomPhase } from '../types/room.js';
import type { QuizDeliveryMode, QuizSchedule } from '../types/schedule.js';

export type { QuizDeliveryMode };

/** Legacy alias from early scheduling UI. */
export function normalizeDeliveryMode(
  mode: QuizDeliveryMode | 'hosted' | undefined,
): QuizDeliveryMode {
  if (mode === 'hosted' || mode === undefined) return 'qm_led';
  return mode;
}

export function isQmLedQuiz(schedule: QuizSchedule | undefined): boolean {
  return schedule?.enabled === true && normalizeDeliveryMode(schedule.deliveryMode) === 'qm_led';
}

export function isSelfPacedQuiz(schedule: QuizSchedule | undefined): boolean {
  return schedule?.enabled === true && normalizeDeliveryMode(schedule.deliveryMode) === 'self_paced';
}

export function isIntervalQuiz(schedule: QuizSchedule | undefined): boolean {
  return schedule?.enabled === true && normalizeDeliveryMode(schedule.deliveryMode) === 'interval';
}

export function deliveryModeLabel(mode: QuizDeliveryMode | 'hosted' | undefined): string {
  switch (normalizeDeliveryMode(mode)) {
    case 'self_paced':
      return 'Selvgående';
    case 'interval':
      return 'Intervall';
    default:
      return 'QM-styrt';
  }
}

export function isProvisionalLeaderboardVisible(
  schedule: QuizSchedule | undefined,
  phase: RoomPhase,
  options: {
    showLeaderboard?: boolean;
    finalResultLocked?: boolean;
    teamsLockedOut?: boolean;
  },
): boolean {
  if (options.finalResultLocked) return true;
  if (phase === 'leaderboard' || phase === 'post_quiz') {
    return Boolean(options.showLeaderboard);
  }
  if (!isSelfPacedQuiz(schedule)) return false;
  return phase === 'live';
}

export function isTeamQuestionLocked(
  teamQuestionLocks: Record<string, string[]> | undefined,
  teamId: string | undefined,
  questionId: string,
): boolean {
  if (!teamId) return false;
  return (teamQuestionLocks?.[teamId] ?? []).includes(questionId);
}

export function canTeamWorkOnQuestion(
  schedule: QuizSchedule | undefined,
  phase: RoomPhase,
  teamsLockedOut: boolean | undefined,
  teamQuestionLocks: Record<string, string[]> | undefined,
  teamId: string | undefined,
  question: Pick<Question, 'id' | 'type'>,
): boolean {
  if (phase !== 'live' || teamsLockedOut) return false;
  if (!isSelfPacedQuiz(schedule)) return false;
  if (question.type === 'game') return true;
  return !isTeamQuestionLocked(teamQuestionLocks, teamId, question.id);
}
