import {
  buildAnagramResults,
  buildDropBallResults,
  clampDropBallScore,
  sanitizeDropBallRounds,
  buildEmojiHuntResults,
  buildMathExpressionResults,
  buildRevealImageResults,
  buildRainbowPuzzleResults,
  buildTimerChallengeResults,
  gameResultsToScoreEntries,
  isAnagramAnswerCorrect,
  isAnagramSubmissionPayload,
  isDropBallSubmissionPayload,
  isEmojiHuntSubmissionPayload,
  isMathExpressionSubmissionPayload,
  isRevealImageAnswerCorrect,
  isRevealImageClientAnswerPayload,
  isRainbowPuzzleSubmissionPayload,
  type GameSubmissionPayload,
  type StoredGameSubmissionPayload,
} from '@quiz-tool/shared';
import { isSelfPacedQuiz } from '@quiz-tool/shared';
import type { GameResult, GameRound, GameSubmission } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/roomStoreTypes.js';
import { generateId } from '../utils/id.js';
import { upsertScore } from './gradingService.js';
import {
  ensureRevealImageProgress,
  getRevealImageProgress,
  recordRevealImageWrongChoice,
} from './revealImageService.js';

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
  if (existingRound) {
    return {
      ...room,
      gameRounds: room.gameRounds.map((round) =>
        round.questionId === questionId ? { ...round, lockedAt: undefined } : round,
      ),
      gameStarts: room.gameStarts.filter((item) => item.questionId !== questionId),
    };
  }

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
  if (room.settings.finalResultLocked) {
    throw new Error('Endelig resultat er låst.');
  }
  if (room.settings.teamsLockedOut) {
    throw new Error('Quizen er avsluttet for deltakere.');
  }

  if (!isSelfPacedQuiz(room.schedule) && room.questionStatus[questionId] !== 'open') {
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
  if (room.settings.finalResultLocked) {
    throw new Error('Endelig resultat er låst.');
  }
  if (room.settings.teamsLockedOut) {
    throw new Error('Quizen er avsluttet for deltakere.');
  }

  if (!isSelfPacedQuiz(room.schedule) && room.questionStatus[questionId] !== 'open') {
    throw new Error('Spillet er ikke åpent.');
  }

  let activeRoom = room;
  const question = activeRoom.questions.find((q) => q.id === questionId);
  if (question?.type !== 'game' || !question.game) {
    throw new Error('Spørsmålet er ikke et spill.');
  }

  const round = activeRoom.gameRounds.find((item) => item.questionId === questionId && !item.lockedAt);
  const teamStart = activeRoom.gameStarts.find(
    (item) => item.questionId === questionId && item.teamId === teamId,
  );
  if (!round || (question.game.gameId === 'timerChallenge' && !teamStart)) {
    throw new Error('Spillet er ikke startet.');
  }

  const now = Date.now();
  let submissionPayload: StoredGameSubmissionPayload;
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
  } else if (question.game.gameId === 'dropBall') {
    if (!isDropBallSubmissionPayload(payload)) {
      throw new Error('Ugyldig spillinnsending.');
    }
    const rounds = sanitizeDropBallRounds(payload.rounds, question.game);
    const score =
      rounds.length > 0
        ? rounds.reduce((sum, roundResult) => sum + roundResult.score, 0)
        : clampDropBallScore(payload.score, question.game);
    submissionPayload = {
      gameId: 'dropBall',
      score: clampDropBallScore(score, question.game),
      rounds,
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
  } else if (question.game.gameId === 'anagram') {
    if (!isAnagramSubmissionPayload(payload)) {
      throw new Error('Ugyldig spillinnsending.');
    }
    if (!isAnagramAnswerCorrect(payload.answer, question.game.answerText)) {
      return room;
    }
    submissionPayload = {
      gameId: 'anagram',
      answer: payload.answer.slice(0, 200),
    };
  } else if (question.game.gameId === 'mathExpression') {
    if (!isMathExpressionSubmissionPayload(payload)) {
      throw new Error('Ugyldig spillinnsending.');
    }
    if (question.game.mode === 'single') {
      if (payload.mode !== 'single') throw new Error('Ugyldig spillinnsending.');
      submissionPayload = {
        gameId: 'mathExpression',
        mode: 'single',
        answer: payload.answer.slice(0, 80),
      };
    } else {
      if (payload.mode !== 'race') throw new Error('Ugyldig spillinnsending.');
      const alreadyCompleted = activeRoom.gameSubmissions.some(
        (submission) =>
          submission.questionId === questionId &&
          submission.teamId === teamId &&
          submission.payload.gameId === 'mathExpression' &&
          submission.payload.mode === 'race',
      );
      if (alreadyCompleted) return activeRoom;
      submissionPayload = {
        gameId: 'mathExpression',
        mode: 'race',
        totalMs: Math.max(0, Math.round(payload.totalMs)),
        penalties: Math.max(0, Math.round(payload.penalties)),
      };
    }
  } else if (question.game.gameId === 'revealImage') {
    if (!isRevealImageClientAnswerPayload(payload)) {
      throw new Error('Ugyldig spillinnsending.');
    }
    const config = question.game;
    const totalTiles = config.gridSize * config.gridSize;
    activeRoom = ensureRevealImageProgress(activeRoom, questionId, teamId, config.gridSize);
    const progress = getRevealImageProgress(activeRoom, questionId, teamId);
    if (!progress) {
      throw new Error('Spilltilstand mangler.');
    }
    const usedChoices = progress.usedChoices || payload.source === 'choice';
    const answer = payload.answer.slice(0, 200);
    const correct = isRevealImageAnswerCorrect(answer, config);
    if (payload.source === 'choice' && payload.choiceId && !correct) {
      activeRoom = recordRevealImageWrongChoice(
        activeRoom,
        questionId,
        teamId,
        payload.choiceId,
      );
    }
    submissionPayload = {
      gameId: 'revealImage',
      answer,
      openedTiles: progress.openedTileIndices.length,
      totalTiles,
      usedChoices,
      source: payload.source,
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

  const updated: RoomRecord = {
    ...activeRoom,
    gameSubmissions: [
      ...activeRoom.gameSubmissions,
      submission,
    ],
    gameStarts: activeRoom.gameStarts.filter(
      (item) => !(item.questionId === questionId && item.teamId === teamId),
    ),
    answeredByTeam: markAnswered(activeRoom, teamId, questionId),
  };

  return calculateGameQuestionResults(updated, questionId, { lockRound: false });
}

export function calculateGameQuestionResults(
  room: RoomRecord,
  questionId: string,
  options: { lockRound?: boolean } = {},
): RoomRecord {
  const question = room.questions.find((q) => q.id === questionId);
  if (question?.type !== 'game' || !question.game) return room;

  const lockRound = options.lockRound ?? true;
  const timestamp = Date.now();
  const rounds = room.gameRounds.map((round) =>
    round.questionId === questionId
      ? {
          ...round,
          lockedAt: lockRound ? timestamp : round.lockedAt,
        }
      : round,
  );
  const hasRound = rounds.some((round) => round.questionId === questionId);
  const gameRounds = hasRound
    ? rounds
    : [
        ...rounds,
        {
          questionId,
          gameId: question.game.gameId,
          startedAt: timestamp,
          lockedAt: lockRound ? timestamp : undefined,
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
  } else if (question.game.gameId === 'dropBall') {
    results = buildDropBallResults(
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
  } else if (question.game.gameId === 'anagram') {
    results = buildAnagramResults(
      questionId,
      question.maxPoints,
      question.game,
      submissions,
    );
    const teamsWithResults = new Set(results.map((result) => result.teamId));
    results = [
      ...results,
      ...room.teams
        .filter((team) => !teamsWithResults.has(team.id))
        .map((team) => ({
          questionId,
          teamId: team.id,
          gameId: 'anagram' as const,
          rankValue: 0,
          displayValue: 'Ikke besvart',
          rank: 0,
          quizPoints: 0,
          status: 'ranked' as const,
        })),
    ];
  } else if (question.game.gameId === 'mathExpression') {
    results = buildMathExpressionResults(
      questionId,
      question.maxPoints,
      question.game,
      submissions,
      room.teams.map((team) => team.id),
    );
  } else if (question.game.gameId === 'revealImage') {
    results = buildRevealImageResults(
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
  return questionIds.reduce(
    (currentRoom, questionId) => calculateGameQuestionResults(currentRoom, questionId),
    room,
  );
}
