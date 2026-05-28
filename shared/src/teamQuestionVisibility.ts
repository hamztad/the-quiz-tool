import type { Question, RoomState } from './types/room.js';
import { isIntervalQuestionRevealed } from './quiz/intervalSchedule.js';
import { isSelfPacedQuiz } from './quiz/quizModes.js';

export function isQuestionRevealedToTeam(
  room: Pick<RoomState, 'questionStatus' | 'questionsActivated' | 'schedule' | 'phase' | 'serverNow'>,
  questionId: string,
  now = room.serverNow ?? Date.now(),
): boolean {
  if (
    isIntervalQuestionRevealed(room.schedule, room.questionStatus, questionId, now)
  ) {
    return true;
  }
  if (isSelfPacedQuiz(room.schedule) && room.phase === 'live') {
    return true;
  }
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
    orderingItems: undefined,
    orderingCorrectOrder: undefined,
    orderingDirectionTop: undefined,
    orderingDirectionBottom: undefined,
    options:
      question.type === 'mc'
        ? question.options?.map((o) => ({ ...o, text: '', media: undefined }))
        : undefined,
    gameType: undefined,
    game: undefined,
    media: undefined,
  };
}
