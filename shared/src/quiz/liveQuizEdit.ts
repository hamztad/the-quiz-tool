import type { Question, RoomPhase } from '../types/room.js';

export const LIVE_QUIZ_EDIT_PHASES: RoomPhase[] = ['live', 'grading', 'leaderboard'];

export function isLiveQuizEditPhase(phase: RoomPhase): boolean {
  return LIVE_QUIZ_EDIT_PHASES.includes(phase);
}

export function isQuestionEditableDuringLiveQuiz(
  questionStatus: Record<string, 'locked' | 'open'> | undefined,
  questionId: string,
): boolean {
  return questionStatus?.[questionId] !== 'open';
}

export function assertLiveQuizQuestionUpdates(
  room: {
    phase: RoomPhase;
    questions: Question[];
    questionStatus: Record<string, 'locked' | 'open'>;
  },
  nextQuestions: Question[],
): void {
  if (!isLiveQuizEditPhase(room.phase)) return;

  const prevIds = room.questions.map((q) => q.id);
  const nextIds = nextQuestions.map((q) => q.id);
  if (prevIds.length !== nextIds.length || !prevIds.every((id, i) => id === nextIds[i])) {
    throw new Error(
      'Under live quiz kan du bare endre innholdet i lukkede spørsmål — ikke legge til, fjerne eller endre rekkefølge.',
    );
  }

  const nextById = new Map(nextQuestions.map((q) => [q.id, q]));
  for (const q of room.questions) {
    if (room.questionStatus[q.id] !== 'open') continue;
    const next = nextById.get(q.id);
    if (!next || JSON.stringify(q) !== JSON.stringify(next)) {
      throw new Error(
        'Åpne spørsmål kan ikke endres. Lukk spørsmålet først, rediger, og åpne det på nytt.',
      );
    }
  }
}

/** Keep server copy of open questions when persisting from a draft. */
export function mergeDraftWithLockedOpenQuestions(
  roomQuestions: Question[],
  draftQuestions: Question[],
  questionStatus: Record<string, 'locked' | 'open'>,
): Question[] {
  const roomById = new Map(roomQuestions.map((q) => [q.id, q]));
  return draftQuestions.map((q) =>
    questionStatus[q.id] === 'open' ? (roomById.get(q.id) ?? q) : q,
  );
}
