import type { PublicRoomState, Question, RoomState } from '@quiz-tool/shared';
import { isQuestionRevealedToTeam, redactQuestionForTeam } from '@quiz-tool/shared';
import { MAX_TEAMS, validateQuestionsForSave, validateTeamName } from '@quiz-tool/shared';
import { createConnectedTeamPresence, markTeamConnected, markTeamDisconnected } from '@quiz-tool/shared';
import { buildFinalLeaderboardSnapshot } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/RoomStore.js';
import { generateId, generateJoinCode, generateToken } from '../utils/id.js';
import { computeLeaderboard } from './leaderboardService.js';

export function createRoom(title?: string): RoomRecord {
  const roomId = generateId('room');
  const joinCode = generateJoinCode();
  const hostToken = generateToken();

  const room: RoomRecord = {
    id: roomId,
    joinCode,
    phase: 'lobby',
    teams: [],
    teamPresence: {},
    questions: [],
    questionStatus: {},
    questionsActivated: {},
    answeredByTeam: {},
    answers: [],
    gameRounds: [],
    gameStarts: [],
    gameSubmissions: [],
    gameResults: [],
    scores: [],
    gradingAssignments: [],
    peerGrades: [],
    protests: [],
    settings: {
      showLeaderboard: false,
      teamReviewOpen: false,
      answerKeyOpen: false,
      allowNewTeams: true,
      finalResultLocked: false,
    },
    hostToken,
    teamTokens: {},
    teamBrowserTokens: {},
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };

  void title;
  return room;
}

export function joinTeam(
  room: RoomRecord,
  teamName: string,
  options: { browserToken?: string; now?: number } = {},
): { room: RoomRecord; teamId: string; teamToken: string } {
  if (room.teams.length >= MAX_TEAMS) {
    throw new Error('Maks antall lag er nådd.');
  }

  const nameResult = validateTeamName(teamName);
  if (!nameResult.ok) {
    throw new Error(nameResult.message);
  }
  const trimmed = nameResult.name;

  const teamId = generateId('team');
  const teamToken = generateToken();
  const now = options.now ?? Date.now();

  const updated: RoomRecord = {
    ...room,
    teams: [...room.teams, { id: teamId, name: trimmed }],
    teamPresence: { ...room.teamPresence, [teamId]: createConnectedTeamPresence(teamId, now) },
    answeredByTeam: { ...room.answeredByTeam, [teamId]: [] },
    teamTokens: { ...room.teamTokens, [teamId]: teamToken },
    teamBrowserTokens: options.browserToken
      ? { ...room.teamBrowserTokens, [teamId]: options.browserToken }
      : room.teamBrowserTokens,
  };

  return { room: updated, teamId, teamToken };
}

export function findTeamIdByBrowserToken(room: RoomRecord, browserToken?: string): string | null {
  if (!browserToken) return null;
  const match = Object.entries(room.teamBrowserTokens).find(([, token]) => token === browserToken);
  return match?.[0] ?? null;
}

export function markTeamSocketConnected(room: RoomRecord, teamId: string, now = Date.now()): RoomRecord {
  return {
    ...room,
    teamPresence: {
      ...room.teamPresence,
      [teamId]: markTeamConnected(room.teamPresence[teamId], teamId, now),
    },
  };
}

export function markTeamSocketDisconnected(room: RoomRecord, teamId: string, now = Date.now()): RoomRecord {
  return {
    ...room,
    teamPresence: {
      ...room.teamPresence,
      [teamId]: markTeamDisconnected(room.teamPresence[teamId], teamId, now),
    },
  };
}

function recomputeAnsweredByTeam(
  teams: RoomRecord['teams'],
  answers: RoomRecord['answers'],
  gameSubmissions: RoomRecord['gameSubmissions'] = [],
): Record<string, string[]> {
  const map = Object.fromEntries(teams.map((t) => [t.id, [] as string[]]));
  for (const item of [...answers, ...gameSubmissions]) {
    const list = map[item.teamId];
    if (list && !list.includes(item.questionId)) {
      list.push(item.questionId);
    }
  }
  return map;
}

/** Lobby / full replace: resets answers and grading state */
export function setQuestions(room: RoomRecord, questions: Question[]): RoomRecord {
  const validationErrors = validateQuestionsForSave(questions);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(' '));
  }

  const questionStatus: Record<string, 'locked' | 'open'> = {};
  questions.forEach((q) => {
    questionStatus[q.id] = 'locked';
  });

  const questionsActivated: Record<string, boolean> = {};
  questions.forEach((q) => {
    questionsActivated[q.id] = false;
  });

  return {
    ...room,
    questions: questions.map((q, i) => ({ ...q, order: i })),
    questionStatus,
    questionsActivated,
    answers: [],
    gameRounds: [],
    gameStarts: [],
    gameSubmissions: [],
    gameResults: [],
    scores: [],
    finalLeaderboardSnapshot: undefined,
    answeredByTeam: Object.fromEntries(room.teams.map((t) => [t.id, []])),
    gradingAssignments: [],
    peerGrades: [],
    protests: [],
  };
}

/** Live edit: keep answers/scores for remaining questions */
export function updateQuestions(room: RoomRecord, questions: Question[]): RoomRecord {
  const validationErrors = validateQuestionsForSave(questions);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(' '));
  }

  const newIds = new Set(questions.map((q) => q.id));
  const questionStatus: Record<string, 'locked' | 'open'> = {};
  const questionsActivated: Record<string, boolean> = {};

  for (const q of questions) {
    questionStatus[q.id] = room.questionStatus[q.id] ?? 'locked';
    questionsActivated[q.id] = room.questionsActivated[q.id] ?? false;
  }

  const answers = room.answers.filter((a) => newIds.has(a.questionId));
  const gameRounds = room.gameRounds.filter((round) => newIds.has(round.questionId));
  const gameStarts = room.gameStarts.filter((start) => newIds.has(start.questionId));
  const gameSubmissions = room.gameSubmissions.filter((submission) =>
    newIds.has(submission.questionId),
  );
  const gameResults = room.gameResults.filter((result) => newIds.has(result.questionId));
  const scores = room.scores.filter((s) => newIds.has(s.questionId));
  const peerGrades = room.peerGrades.filter((pg) => newIds.has(pg.questionId));
  const protests = room.protests.filter((p) => newIds.has(p.questionId));
  const gradingAssignments = room.gradingAssignments
    .map((a) => ({
      ...a,
      questionIds: a.questionIds.filter((id) => newIds.has(id)),
    }))
    .filter((a) => a.questionIds.length > 0);

  return {
    ...room,
    questions: questions.map((q, i) => ({ ...q, order: i })),
    questionStatus,
    questionsActivated,
    answers,
    gameRounds,
    gameStarts,
    gameSubmissions,
    gameResults,
    scores,
    answeredByTeam: recomputeAnsweredByTeam(room.teams, answers, gameSubmissions),
    gradingAssignments,
    peerGrades,
    protests,
  };
}

export function removeTeam(room: RoomRecord, teamId: string): RoomRecord {
  const teams = room.teams.filter((t) => t.id !== teamId);
  if (teams.length === room.teams.length) {
    throw new Error('Lag finnes ikke.');
  }

  const teamTokens = { ...room.teamTokens };
  delete teamTokens[teamId];
  const teamBrowserTokens = { ...room.teamBrowserTokens };
  delete teamBrowserTokens[teamId];
  const teamPresence = { ...room.teamPresence };
  delete teamPresence[teamId];

  const answers = room.answers.filter((a) => a.teamId !== teamId);
  const gameStarts = room.gameStarts.filter((start) => start.teamId !== teamId);
  const gameSubmissions = room.gameSubmissions.filter((submission) => submission.teamId !== teamId);
  const gameResults = room.gameResults.filter((result) => result.teamId !== teamId);
  const scores = room.scores.filter((s) => s.teamId !== teamId);
  const peerGrades = room.peerGrades.filter(
    (pg) => pg.graderTeamId !== teamId && pg.targetTeamId !== teamId,
  );
  const protests = room.protests.filter((p) => p.teamId !== teamId);
  const gradingAssignments = room.gradingAssignments.filter(
    (a) => a.graderTeamId !== teamId && a.targetTeamId !== teamId,
  );

  return {
    ...room,
    teams,
    teamTokens,
    teamBrowserTokens,
    teamPresence,
    answers,
    gameStarts,
    gameSubmissions,
    gameResults,
    scores,
    peerGrades,
    protests,
    gradingAssignments,
    answeredByTeam: recomputeAnsweredByTeam(teams, answers, gameSubmissions),
  };
}

export function startQuiz(room: RoomRecord): RoomRecord {
  if (room.questions.length === 0) {
    throw new Error('Legg til spørsmål før du starter quizen.');
  }
  return { ...room, phase: 'live' };
}

export function lockFinalResult(room: RoomRecord, now = Date.now()): RoomRecord {
  const pendingProtests = room.protests.some((protest) => protest.status === 'pending');
  if (pendingProtests) {
    throw new Error('Alle protester må behandles før sluttresultatet kan låses.');
  }
  if (room.phase === 'grading') {
    throw new Error('Avslutt retterunden før sluttresultatet låses.');
  }
  if (room.phase !== 'leaderboard' && room.phase !== 'post_quiz') {
    throw new Error('Sluttresultatet kan låses etter at quizen er avsluttet eller leaderboard er åpnet.');
  }
  return {
    ...room,
    settings: {
      ...room.settings,
      showLeaderboard: true,
      finalResultLocked: true,
    },
    finalLeaderboardSnapshot: buildFinalLeaderboardSnapshot(room.teams, room.scores, now),
  };
}

export function unlockFinalResult(room: RoomRecord): RoomRecord {
  return {
    ...room,
    settings: {
      ...room.settings,
      finalResultLocked: false,
    },
  };
}

/** Soft end: teams see avsluttet-melding; host keeps post-quiz access */
export function endQuizForTeams(room: RoomRecord): RoomRecord {
  return {
    ...room,
    phase: 'post_quiz',
    settings: { ...room.settings, showLeaderboard: true },
  };
}

export function toPublicState(
  room: RoomState,
  role: 'host' | 'secretary',
  viewerTeamId?: string,
): PublicRoomState {
  if (role === 'host') {
    return {
      ...room,
      viewerRole: 'host',
    };
  }

  const teamId = viewerTeamId;
  const assignment = room.gradingAssignments.find((g) => g.graderTeamId === teamId);
  const ownAnsweredQuestionIds = new Set(teamId ? (room.answeredByTeam[teamId] ?? []) : []);
  const teamReviewOpen = room.settings.teamReviewOpen === true;
  const answerKeyOpen = room.settings.answerKeyOpen === true;
  const assignedQuestionIds = new Set(
    room.phase === 'grading' && assignment ? assignment.questionIds : [],
  );

  let visibleAnswers = room.answers.filter((a) => a.teamId === teamId);

  if (room.phase === 'grading' && assignment) {
    const targetAnswers = room.answers.filter(
      (a) => a.teamId === assignment.targetTeamId && assignment.questionIds.includes(a.questionId),
    );
    visibleAnswers = [...visibleAnswers, ...targetAnswers];
  }

  const visibleAnsweredByTeam = teamId
    ? { [teamId]: room.answeredByTeam[teamId] ?? [] }
    : {};
  const visibleScores = room.scores.filter((s) => s.teamId === teamId);
  const visibleGameRounds = room.gameRounds.filter((round) =>
    isQuestionRevealedToTeam(room, round.questionId),
  );
  const visibleGameStarts = room.gameStarts.filter((start) => start.teamId === teamId);
  const visibleGameSubmissions = room.gameSubmissions.filter(
    (submission) => submission.teamId === teamId,
  );
  const visibleGameResults = room.gameResults.filter((result) => {
    const resultsOpen =
      room.questionStatus[result.questionId] === 'locked' ||
      room.settings.showLeaderboard ||
      room.phase === 'leaderboard' ||
      room.phase === 'post_quiz';
    return resultsOpen;
  });
  const visiblePeerGrades = room.peerGrades.filter((pg) => {
    if (pg.targetTeamId === teamId) return true;
    if (room.phase === 'grading' && pg.graderTeamId === teamId) return true;
    return false;
  });
  const visibleProtests = room.protests.filter((p) => p.teamId === teamId);
  const visibleGradingAssignments = assignment ? [assignment] : [];
  const leaderboardVisible =
    room.phase === 'leaderboard' ||
    room.settings.showLeaderboard ||
    room.settings.finalResultLocked ||
    room.phase === 'post_quiz';

  const hideTeamOnlySecrets = (question: (typeof room.questions)[number]) => {
    if (question.type === 'ordering') {
      return {
        ...question,
        orderingCorrectOrder: undefined,
      };
    }
    if (question.game?.gameId !== 'anagram') return question;
    return {
      ...question,
      game: {
        ...question.game,
        answerText: '',
      },
    };
  };

  const questions = room.questions.map((q) => {
    if (answerKeyOpen) return q;
    const showReviewFasit = teamReviewOpen && ownAnsweredQuestionIds.has(q.id);
    const showGradingFasit = assignedQuestionIds.has(q.id);
    const revealed = isQuestionRevealedToTeam(room, q.id) || showReviewFasit || showGradingFasit;
    const redacted = redactQuestionForTeam(q, revealed);
    if (showReviewFasit || showGradingFasit || redacted.lines.length === 0) {
      return redacted;
    }
    return hideTeamOnlySecrets({
      ...redacted,
      acceptedAnswers: undefined,
      options:
        redacted.type === 'mc'
          ? redacted.options?.map((o) => ({ ...o, isCorrect: false }))
          : undefined,
    });
  });

  return {
    ...room,
    questions,
    leaderboard: leaderboardVisible
      ? room.settings.finalResultLocked && room.finalLeaderboardSnapshot
        ? room.finalLeaderboardSnapshot.entries
        : computeLeaderboard(room)
      : undefined,
    answeredByTeam: visibleAnsweredByTeam,
    answers: visibleAnswers,
    gameRounds: visibleGameRounds,
    gameStarts: visibleGameStarts,
    gameSubmissions: visibleGameSubmissions,
    gameResults: visibleGameResults,
    scores: visibleScores,
    gradingAssignments: visibleGradingAssignments,
    peerGrades: visiblePeerGrades,
    protests: visibleProtests,
    viewerRole: 'secretary',
    viewerTeamId: teamId,
  };
}
