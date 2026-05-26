import {
  buildEmojiHuntResults,
  buildRainbowPuzzleResults,
  buildTimerChallengeResults,
  gameResultsToScoreEntries,
  isEmojiHuntSubmissionPayload,
  isRainbowPuzzleSubmissionPayload,
  type GameSubmissionPayload,
} from '@quiz-tool/shared';
import type { GameResult, GameRound, GameSubmission } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/RoomStore.js';
import { generateId } from '../utils/id.js';
import { upsertScore } from './gradingService.js';

function markAnswered(room: RoomRecord, teamId: string, questionId: string): Record<string, string[]> {
  const current = room.answeredByTeam[teamId] ?? [];
  if (current.includes(questionId)) return room.answeredByTeam;
  return {
    ...room.answeredByTeam,
    [teamId]: [...current, questionId],
  };
}

export function startGameRound(room: RoomRecord, questionId: string): RoomRecord {
  const question = room.questions.find((q) => q.id === questionId);
  if (question?.type !== 'game' || !question.game) return room;

  const existingRound = room.gameRounds.find((round) => round.questionId === questionId);
  if (existingRound && !existingRound.lockedAt) return room;

  const round: GameRound = {
    questionId,
    gameId: question.game.gameId,
    startedAt: Date.now(),
    roundNonce: generateId('round'),
  };

  return {
    ...room,
    gameRounds: [
      ...room.gameRounds.filter((item) => item.questionId !== questionId),
      round,
    ],
    gameStarts: room.gameStarts.filter((item) => item.questionId !== questionId),
    gameSubmissions: room.gameSubmissions.filter((item) => item.questionId !== questionId),
    gameResults: room.gameResults.filter((item) => item.questionId !== questionId),
    scores: room.scores.filter((score) => !(score.questionId === questionId && score.source === 'game')),
  };
}

export function startTeamGame(
  room: RoomRecord,
  teamId: string,
  questionId: string,
): RoomRecord {
  if (room.phase !== 'live') {
    throw new Error('Quizen er ikke startet ennå.');
  }

  if (room.questionStatus[questionId] !== 'open') {
    throw new Error('Spillet er ikke åpent.');
  }

  const question = room.questions.find((q) => q.id === questionId);
  if (question?.type !== 'game' || !question.game) {
    throw new Error('Spørsmålet er ikke et spill.');
  }

  const existing = room.gameStarts.find(
    (item) => item.questionId === questionId && item.teamId === teamId,
  );
  if (existing) return room;

  return {
    ...room,
    gameStarts: [
      ...room.gameStarts,
      {
        questionId,
        teamId,
        gameId: question.game.gameId,
        startedAt: Date.now(),
      },
    ],
  };
}

export function submitGameResult(
  room: RoomRecord,
  teamId: string,
  questionId: string,
  payload: GameSubmissionPayload,
): RoomRecord {
  if (room.phase !== 'live') {
    throw new Error('Quizen er ikke startet ennå.');
  }

  if (room.questionStatus[questionId] !== 'open') {
    throw new Error('Spillet er ikke åpent.');
  }

  const question = room.questions.find((q) => q.id === questionId);
  if (question?.type !== 'game' || !question.game) {
    throw new Error('Spørsmålet er ikke et spill.');
  }

  const round = room.gameRounds.find((item) => item.questionId === questionId && !item.lockedAt);
  const teamStart = room.gameStarts.find(
    (item) => item.questionId === questionId && item.teamId === teamId,
  );
  if (!round || (question.game.gameId === 'timerChallenge' && !teamStart)) {
    throw new Error('Spillet er ikke startet.');
  }

  const now = Date.now();
  let submissionPayload: GameSubmissionPayload;
  if (question.game.gameId === 'timerChallenge') {
    if (payload.gameId !== 'timerChallenge') {
      throw new Error('Ugyldig spillinnsending.');
    }
    submissionPayload = {
      gameId: 'timerChallenge',
      elapsedMs: Math.max(0, now - teamStart!.startedAt),
    };
  } else if (question.game.gameId === 'rainbowPuzzle') {
    if (!isRainbowPuzzleSubmissionPayload(payload)) {
      throw new Error('Ugyldig spillinnsending.');
    }
    submissionPayload = {
      gameId: 'rainbowPuzzle',
      score: Math.max(0, Math.floor(payload.score)),
    };
  } else if (question.game.gameId === 'emojiHunt') {
    if (!isEmojiHuntSubmissionPayload(payload)) {
      throw new Error('Ugyldig spillinnsending.');
    }
    const maxTotalMs = question.game.targetCount * question.game.maxMsPerTarget;
    submissionPayload = {
      gameId: 'emojiHunt',
      totalMs: Math.min(maxTotalMs, Math.max(0, Math.round(payload.totalMs))),
    };
  } else {
    throw new Error('Dette spillet er ikke støttet ennå.');
  }

  const submission: GameSubmission = {
    questionId,
    teamId,
    gameId: question.game.gameId,
    payload: submissionPayload,
    submittedAt: now,
    serverReceivedAt: now,
  };

  return {
    ...room,
    gameSubmissions: [
      ...room.gameSubmissions,
      submission,
    ],
    gameStarts: room.gameStarts.filter(
      (item) => !(item.questionId === questionId && item.teamId === teamId),
    ),
    answeredByTeam: markAnswered(room, teamId, questionId),
  };
}

export function calculateGameQuestionResults(room: RoomRecord, questionId: string): RoomRecord {
  const question = room.questions.find((q) => q.id === questionId);
  if (question?.type !== 'game' || !question.game) return room;

  const lockedAt = Date.now();
  const rounds = room.gameRounds.map((round) =>
    round.questionId === questionId ? { ...round, lockedAt } : round,
  );
  const hasRound = rounds.some((round) => round.questionId === questionId);
  const gameRounds = hasRound
    ? rounds
    : [
        ...rounds,
        {
          questionId,
          gameId: question.game.gameId,
          startedAt: lockedAt,
          lockedAt,
          roundNonce: generateId('round'),
        } satisfies GameRound,
      ];

  let results: GameResult[] = [];
  const submissions = room.gameSubmissions.filter((item) => item.questionId === questionId);
  if (question.game.gameId === 'timerChallenge') {
    results = buildTimerChallengeResults(
      questionId,
      question.maxPoints,
      question.game,
      submissions,
    );
  } else if (question.game.gameId === 'rainbowPuzzle') {
    results = buildRainbowPuzzleResults(
      questionId,
      question.maxPoints,
      question.game,
      submissions,
    );
  } else if (question.game.gameId === 'emojiHunt') {
    results = buildEmojiHuntResults(
      questionId,
      question.maxPoints,
      question.game,
      submissions,
    );
  }

  const scoreEntries = gameResultsToScoreEntries(results);
  const scoresWithoutGameQuestion = room.scores.filter(
    (score) => !(score.questionId === questionId && score.source === 'game'),
  );
  const scores = scoreEntries.reduce(upsertScore, scoresWithoutGameQuestion);

  return {
    ...room,
    gameRounds,
    gameResults: [
      ...room.gameResults.filter((item) => item.questionId !== questionId),
      ...results,
    ],
    scores,
  };
}

export function calculateGameResultsForQuestions(room: RoomRecord, questionIds: string[]): RoomRecord {
  return questionIds.reduce(calculateGameQuestionResults, room);
}
