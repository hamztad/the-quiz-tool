import { isRevealImageAnswerCorrect, type RevealImageTeamProgress } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/RoomStore.js';

function hasTeamSolvedRevealImage(room: RoomRecord, questionId: string, teamId: string): boolean {
  const question = room.questions.find((item) => item.id === questionId);
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

function shuffleTiles(total: number): number[] {
  const ids = Array.from({ length: total }, (_, index) => index);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

function assertRevealImageQuestionOpen(room: RoomRecord, questionId: string): void {
  if (room.questionStatus[questionId] !== 'open') {
    throw new Error('Spørsmålet er ikke åpent.');
  }
}

function assertRevealImageNotSolved(room: RoomRecord, questionId: string, teamId: string): void {
  if (hasTeamSolvedRevealImage(room, questionId, teamId)) {
    throw new Error('Forsøket er allerede låst etter riktig svar.');
  }
}

export function getRevealImageProgress(
  room: RoomRecord,
  questionId: string,
  teamId: string,
): RevealImageTeamProgress | undefined {
  return room.revealImageProgress?.find(
    (entry) => entry.questionId === questionId && entry.teamId === teamId,
  );
}

function upsertRevealImageProgress(
  room: RoomRecord,
  progress: RevealImageTeamProgress,
): RoomRecord {
  const rest = (room.revealImageProgress ?? []).filter(
    (entry) => !(entry.questionId === progress.questionId && entry.teamId === progress.teamId),
  );
  return {
    ...room,
    revealImageProgress: [...rest, progress],
  };
}

export function ensureRevealImageProgress(
  room: RoomRecord,
  questionId: string,
  teamId: string,
  gridSize: number,
): RoomRecord {
  const existing = getRevealImageProgress(room, questionId, teamId);
  if (existing) return room;
  const totalTiles = gridSize * gridSize;
  const progress: RevealImageTeamProgress = {
    questionId,
    teamId,
    openedTileIndices: [],
    usedChoices: false,
    wrongChoiceIds: [],
    tileOrder: shuffleTiles(totalTiles),
  };
  return upsertRevealImageProgress(room, progress);
}

export function revealNextRevealImageTile(
  room: RoomRecord,
  questionId: string,
  teamId: string,
  gridSize: number,
): RoomRecord {
  assertRevealImageQuestionOpen(room, questionId);
  assertRevealImageNotSolved(room, questionId, teamId);

  let nextRoom = ensureRevealImageProgress(room, questionId, teamId, gridSize);
  const progress = getRevealImageProgress(nextRoom, questionId, teamId);
  if (!progress) return nextRoom;

  const opened = new Set(progress.openedTileIndices);
  const nextTile = progress.tileOrder.find((tile) => !opened.has(tile));
  if (nextTile === undefined) {
    throw new Error('Alle ruter er allerede åpnet.');
  }

  return upsertRevealImageProgress(nextRoom, {
    ...progress,
    openedTileIndices: [...progress.openedTileIndices, nextTile],
  });
}

export function showRevealImageChoices(
  room: RoomRecord,
  questionId: string,
  teamId: string,
  gridSize: number,
): RoomRecord {
  assertRevealImageQuestionOpen(room, questionId);
  assertRevealImageNotSolved(room, questionId, teamId);

  let nextRoom = ensureRevealImageProgress(room, questionId, teamId, gridSize);
  const progress = getRevealImageProgress(nextRoom, questionId, teamId);
  if (!progress || progress.usedChoices) return nextRoom;

  return upsertRevealImageProgress(nextRoom, {
    ...progress,
    usedChoices: true,
  });
}

export function recordRevealImageWrongChoice(
  room: RoomRecord,
  questionId: string,
  teamId: string,
  choiceId: string,
): RoomRecord {
  const progress = getRevealImageProgress(room, questionId, teamId);
  if (!progress || !choiceId || progress.wrongChoiceIds.includes(choiceId)) {
    return room;
  }
  return upsertRevealImageProgress(room, {
    ...progress,
    wrongChoiceIds: [...progress.wrongChoiceIds, choiceId],
  });
}

export function clearRevealImageProgressForQuestion(
  room: RoomRecord,
  questionId: string,
): RoomRecord {
  const revealImageProgress = (room.revealImageProgress ?? []).filter(
    (entry) => entry.questionId !== questionId,
  );
  if (revealImageProgress.length === (room.revealImageProgress ?? []).length) {
    return room;
  }
  return { ...room, revealImageProgress };
}
