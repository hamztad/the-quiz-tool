import type { Question, RoomState } from './types/room.js';

export function isQuestionRevealedToTeam(
  room: Pick<RoomState, 'questionStatus' | 'questionsActivated'>,
  questionId: string,
): boolean {
  if (room.questionStatus[questionId] === 'open') {
    return true;
  }
  return room.questionsActivated[questionId] === true;
}

/** Redact question content before teams have seen it activated. */
export function redactQuestionForTeam(question: Question, revealed: boolean): Question {
  if (revealed) {
    return question;
  }
  return {
    ...question,
    lines: [],
    hint: undefined,
    acceptedAnswers: undefined,
    options:
      question.type === 'mc'
        ? question.options?.map((o) => ({ ...o, text: '' }))
        : undefined,
    game: undefined,
    media: undefined,
  };
}
