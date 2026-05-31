import type { PublicRoomState } from '@quiz-tool/shared';

export type QuizEndNotifyEvent = 'quiz_ended' | 'final_result_locked';

export interface QuizEndNotifySnapshot {
  phase: PublicRoomState['phase'];
  teamsLockedOut: boolean;
  finalResultLocked: boolean;
}

export function snapshotQuizEndNotifyState(room: PublicRoomState): QuizEndNotifySnapshot {
  return {
    phase: room.phase,
    teamsLockedOut: Boolean(room.settings.teamsLockedOut),
    finalResultLocked: Boolean(room.settings.finalResultLocked),
  };
}

export function isQuizEndedForTeams(snapshot: QuizEndNotifySnapshot): boolean {
  return snapshot.phase === 'post_quiz' || snapshot.teamsLockedOut;
}

export function detectQuizEndNotifyEvents(
  prev: QuizEndNotifySnapshot | null,
  next: QuizEndNotifySnapshot,
  initialized: boolean,
): QuizEndNotifyEvent[] {
  if (!initialized || !prev) return [];

  const events: QuizEndNotifyEvent[] = [];
  const wasEnded = isQuizEndedForTeams(prev);
  const isEnded = isQuizEndedForTeams(next);
  if (isEnded && !wasEnded) {
    events.push('quiz_ended');
  }
  if (next.finalResultLocked && !prev.finalResultLocked) {
    events.push('final_result_locked');
  }
  return events;
}

export function quizEndNotifyMessage(event: QuizEndNotifyEvent): string {
  if (event === 'final_result_locked') {
    return 'Sluttresultatet er klart — trykk for å se plasseringen din';
  }
  return 'Gruizen er avsluttet — trykk for å se status og resultater';
}

export function quizEndNotifyBrowserBody(event: QuizEndNotifyEvent): string {
  if (event === 'final_result_locked') {
    return 'Sluttresultatet er klart. Åpne Gruiz for å se plasseringen din.';
  }
  return 'Gruizen er avsluttet. Åpne Gruiz for status og resultater.';
}
