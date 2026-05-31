import type { RoomRecord } from '../store/roomStoreTypes.js';
import { buildMcDisplayOptionOrder, isRevealImageAnswerCorrect } from '@quiz-tool/shared';
import { calculateGameQuestionResults, calculateGameResultsForQuestions, startGameRound } from './gameService.js';
import { clearRevealImageProgressForQuestion } from './revealImageService.js';
import { armQuestionTimer, clearQuestionTimer } from './timing/questionTimerService.js';

export interface OpenQuestionOptions {
  allowWhenTeamsLockedOut?: boolean;
}

function assertCanOpenQuestion(room: RoomRecord, options?: OpenQuestionOptions): void {
  if (room.settings.teamsLockedOut && !options?.allowWhenTeamsLockedOut) {
    throw new Error(
      'Gruizen er avsluttet for spillere. Bruk «Tving åpne» for å åpne spørsmål igjen.',
    );
  }
  if (room.settings.finalResultLocked) {
    throw new Error('Endelig resultat er låst.');
  }
}

export function openQuestion(
  room: RoomRecord,
  questionId: string,
  options?: OpenQuestionOptions,
): RoomRecord {
  const question = room.questions.find((q) => q.id === questionId);
  if (!question) {
    throw new Error('Spørsmål finnes ikke.');
  }
  assertCanOpenQuestion(room, options);

  // Reveal image is single-attempt per opening. Manual reopen clears attempt state and score.
  const isRevealImage = question.type === 'game' && question.game?.gameId === 'revealImage';
  const wasPreviouslyActivated = room.questionsActivated[questionId] === true;
  const shouldResetRevealImage = isRevealImage && wasPreviouslyActivated;

  const resetAnsweredByTeam = shouldResetRevealImage
    ? Object.fromEntries(
        Object.entries(room.answeredByTeam).map(([teamId, questionIds]) => [
          teamId,
          questionIds.filter((id) => id !== questionId),
        ]),
      )
    : room.answeredByTeam;

  const baseRoom: RoomRecord = shouldResetRevealImage
    ? clearRevealImageProgressForQuestion({
        ...room,
        gameSubmissions: room.gameSubmissions.filter(
          (submission) =>
            !(submission.questionId === questionId && submission.gameId === 'revealImage'),
        ),
        gameResults: room.gameResults.filter(
          (result) => !(result.questionId === questionId && result.gameId === 'revealImage'),
        ),
        scores: room.scores.filter(
          (score) => !(score.questionId === questionId && score.source === 'game'),
        ),
        answeredByTeam: resetAnsweredByTeam,
      }, questionId)
    : room;

  let opened: RoomRecord = {
    ...baseRoom,
    questionStatus: { ...baseRoom.questionStatus, [questionId]: 'open' as const },
    questionsActivated: { ...baseRoom.questionsActivated, [questionId]: true },
  };

  if (
    question.type === 'mc' &&
    question.shuffleMcOptionsOnOpen === true &&
    question.options?.length
  ) {
    opened = {
      ...opened,
      mcDisplayOptionOrder: {
        ...opened.mcDisplayOptionOrder,
        [questionId]: buildMcDisplayOptionOrder(question.options),
      },
    };
  }

  opened = startGameRound(opened, questionId);
  opened = armQuestionTimer(opened, question);
  return opened;
}

export function lockQuestion(room: RoomRecord, questionId: string): RoomRecord {
  if (!room.questions.find((q) => q.id === questionId)) {
    throw new Error('Spørsmål finnes ikke.');
  }
  let locked: RoomRecord = {
    ...room,
    questionStatus: { ...room.questionStatus, [questionId]: 'locked' as const },
  };
  if (locked.mcDisplayOptionOrder?.[questionId]) {
    const { [questionId]: _removed, ...rest } = locked.mcDisplayOptionOrder;
    locked = {
      ...locked,
      mcDisplayOptionOrder: Object.keys(rest).length > 0 ? rest : undefined,
    };
  }
  locked = clearQuestionTimer(locked, questionId);
  return calculateGameQuestionResults(locked, questionId);
}

export function lockRound(room: RoomRecord, questionIds: string[]): RoomRecord {
  const status = { ...room.questionStatus };
  for (const id of questionIds) {
    if (status[id] !== undefined) {
      status[id] = 'locked';
    }
  }
  let next: RoomRecord = { ...room, questionStatus: status };
  for (const id of questionIds) {
    next = clearQuestionTimer(next, id);
  }
  return calculateGameResultsForQuestions(next, questionIds);
}

export function forceReopenQuestion(room: RoomRecord, questionId: string): RoomRecord {
  return openQuestion(
    { ...room, settings: { ...room.settings, teamsLockedOut: false } },
    questionId,
    { allowWhenTeamsLockedOut: true },
  );
}

export function hasTeamSolvedRevealImage(
  room: RoomRecord,
  questionId: string,
  teamId: string,
): boolean {
  const question = room.questions.find((q) => q.id === questionId);
  const config = question?.type === 'game' && question.game?.gameId === 'revealImage'
    ? question.game
    : null;
  if (!config) return false;
  return room.gameSubmissions.some(
    (submission) =>
      submission.questionId === questionId &&
      submission.teamId === teamId &&
      submission.gameId === 'revealImage' &&
      submission.payload.gameId === 'revealImage' &&
      isRevealImageAnswerCorrect(submission.payload.answer, config),
  );
}
