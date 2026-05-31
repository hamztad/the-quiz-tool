import {
  deriveHostQuizTitle,
  isProvisionalLeaderboardVisible,
  isQuestionRevealedToTeam,
  redactQuestionForTeam,
  toParticipantEmailNotifyStatus,
  type PublicRoomState,
  type Question,
  type RoomState,
} from '@quiz-tool/shared';
import {
  assertLiveQuizQuestionUpdates,
  canonicalTeamName,
  MAX_TEAMS,
  NB,
  RESERVED_TEST_PARTICIPANT_NAME,
  normalizeQuestionsScoring,
  validateQuestionsForSave,
  validateTeamName,
} from '@quiz-tool/shared';
import {
  computeRoomExpiresAt,
  createConnectedTeamPresence,
  DEFAULT_ROOM_TTL_MS,
  markTeamConnected,
  markTeamDisconnected,
  type HostPresence,
} from '@quiz-tool/shared';
import { buildFinalLeaderboardSnapshot, resolveScoringMode } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/roomStoreTypes.js';
import { generateId, generateJoinCode, generateToken } from '../utils/id.js';
import { computeLeaderboard } from './leaderboardService.js';
import { lockQuestion, openQuestion } from './questionService.js';

export function createRoom(title?: string): RoomRecord {
  const roomId = generateId('room');
  const joinCode = generateJoinCode();
  const hostToken = generateToken();
  const now = Date.now();

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
    aiGrades: [],
    protests: [],
    revealImageProgress: [],
    activeQuestionTimers: {},
    settings: {
      showLeaderboard: false,
      teamReviewOpen: false,
      answerKeyOpen: false,
      allowNewTeams: true,
      finalResultLocked: false,
      testMode: false,
      teamsLockedOut: false,
      openAnswerGradingMode: 'peer',
      scoringMode: 'performance',
    },
    hostToken,
    teamTokens: {},
    teamBrowserTokens: {},
    expiresAt: now + DEFAULT_ROOM_TTL_MS,
    createdAt: now,
    lastActiveAt: now,
    hostTitle: title?.trim() ? title.trim().slice(0, 120) : undefined,
    hostPresence: { connected: false, lastSeenAt: now },
  };

  return room;
}

export function markHostSocketConnected(room: RoomRecord, now = Date.now()): RoomRecord {
  const hostPresence: HostPresence = {
    connected: true,
    lastSeenAt: now,
    disconnectedAt: undefined,
  };
  return { ...room, hostPresence };
}

export function markHostSocketDisconnected(room: RoomRecord, now = Date.now()): RoomRecord {
  const hostPresence: HostPresence = {
    connected: false,
    lastSeenAt: now,
    disconnectedAt: now,
  };
  return { ...room, hostPresence };
}

export function syncHostTitleFromQuestions(room: RoomRecord): RoomRecord {
  const title = deriveHostQuizTitle(room.joinCode, room.questions, room.hostTitle);
  if (title === room.hostTitle) return room;
  return { ...room, hostTitle: title };
}

export function joinTeam(
  room: RoomRecord,
  teamName: string,
  options: { browserToken?: string; now?: number; isTest?: boolean } = {},
): { room: RoomRecord; teamId: string; teamToken: string } {
  if (room.teams.length >= MAX_TEAMS) {
    throw new Error(NB.maxParticipantsReached);
  }

  const nameResult = validateTeamName(teamName, {
    allowReservedTestName: options.isTest === true,
  });
  if (!nameResult.ok) {
    throw new Error(nameResult.message);
  }
  const trimmed = nameResult.name;
  const canonical = canonicalTeamName(trimmed);
  if (room.teams.some((team) => canonicalTeamName(team.name) === canonical)) {
    throw new Error(NB.participantNameTaken);
  }

  const teamId = generateId('team');
  const teamToken = generateToken();
  const now = options.now ?? Date.now();

  const updated: RoomRecord = {
    ...room,
    teams: [...room.teams, { id: teamId, name: trimmed, ...(options.isTest ? { isTest: true } : {}) }],
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
  const normalized = normalizeQuestionsScoring(questions);
  const validationErrors = validateQuestionsForSave(normalized);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(' '));
  }

  const questionStatus: Record<string, 'locked' | 'open'> = {};
  normalized.forEach((q) => {
    questionStatus[q.id] = 'locked';
  });

  const questionsActivated: Record<string, boolean> = {};
  normalized.forEach((q) => {
    questionsActivated[q.id] = false;
  });

  return {
    ...room,
    questions: normalized.map((q, i) => ({ ...q, order: i })),
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
    aiGrades: [],
    aiGrading: undefined,
    protests: [],
  };
}

/** Live edit: keep answers/scores for remaining questions */
export function updateQuestions(room: RoomRecord, questions: Question[]): RoomRecord {
  const normalized = normalizeQuestionsScoring(questions);
  const validationErrors = validateQuestionsForSave(normalized);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(' '));
  }

  assertLiveQuizQuestionUpdates(room, normalized);

  const newIds = new Set(normalized.map((q) => q.id));
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
    questions: normalized.map((q, i) => ({ ...q, order: i })),
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
    throw new Error(NB.participantNotFound);
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

  const teamEmailNotify = room.teamEmailNotify ? { ...room.teamEmailNotify } : undefined;
  if (teamEmailNotify) {
    delete teamEmailNotify[teamId];
  }

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
    teamEmailNotify:
      teamEmailNotify && Object.keys(teamEmailNotify).length > 0 ? teamEmailNotify : undefined,
  };
}

/** Start live phase if needed and open every question for Gruizmaster test run. */
export function prepareRoomForTestSession(room: RoomRecord): RoomRecord {
  let next: RoomRecord =
    room.phase === 'lobby'
      ? { ...room, phase: 'live', liveStartedAt: Date.now() }
      : room;

  for (const question of next.questions) {
    next = openQuestion(next, question.id, { allowWhenTeamsLockedOut: true });
  }
  return next;
}

function lockAllQuestionsAfterTest(room: RoomRecord): RoomRecord {
  let next = room;
  for (const question of next.questions) {
    if (next.questionStatus[question.id] === 'open') {
      next = lockQuestion(next, question.id);
    }
  }
  return next;
}

export function startTestSession(
  room: RoomRecord,
): { room: RoomRecord; teamId: string; teamToken: string } {
  if (room.questions.length === 0) {
    throw new Error('Legg til spørsmål før du prøver Gruizen.');
  }

  const existingTestId =
    room.settings.testTeamId ?? room.teams.find((team) => team.isTest)?.id;
  if (existingTestId) {
    const token = room.teamTokens[existingTestId];
    if (token) {
      const prepared = prepareRoomForTestSession({
        ...room,
        settings: { ...room.settings, testMode: true, testTeamId: existingTestId },
      });
      return {
        room: prepared,
        teamId: existingTestId,
        teamToken: token,
      };
    }
  }

  const joined = joinTeam(prepareRoomForTestSession(room), RESERVED_TEST_PARTICIPANT_NAME, {
    isTest: true,
  });
  return {
    room: {
      ...joined.room,
      settings: {
        ...joined.room.settings,
        testMode: true,
        testTeamId: joined.teamId,
      },
    },
    teamId: joined.teamId,
    teamToken: joined.teamToken,
  };
}

export function endTestSession(room: RoomRecord): RoomRecord {
  const testTeamId =
    room.settings.testTeamId ?? room.teams.find((team) => team.isTest)?.id;
  if (!testTeamId) {
    return {
      ...room,
      settings: { ...room.settings, testMode: false, testTeamId: undefined },
    };
  }

  let next = removeTeam(room, testTeamId);
  next = lockAllQuestionsAfterTest(next);
  next = {
    ...next,
    settings: { ...next.settings, testMode: false, testTeamId: undefined },
  };

  const onlyTestWasPlaying =
    next.teams.length === 0 && next.phase !== 'lobby' && next.phase !== 'ended';
  if (onlyTestWasPlaying) {
    next = { ...next, phase: 'lobby', liveStartedAt: undefined };
  }

  return next;
}

export function startQuiz(room: RoomRecord, now = Date.now()): RoomRecord {
  if (room.questions.length === 0) {
    throw new Error('Legg til spørsmål før du starter Gruizen.');
  }
  if (
    room.schedule?.enabled &&
    room.schedule.startsAt &&
    now < room.schedule.startsAt &&
    room.schedule.runMode !== 'manual'
  ) {
    throw new Error(
      'Gruizen har planlagt start. Vent til nedtellingen er ferdig, eller avbryt tidsplanen.',
    );
  }
  const cleared = room.settings.testMode ? endTestSession(room) : room;
  return { ...cleared, phase: 'live', liveStartedAt: now };
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
    throw new Error('Sluttresultatet kan låses etter at Gruizen er avsluttet eller leaderboard er åpnet.');
  }
  return {
    ...room,
    settings: {
      ...room.settings,
      showLeaderboard: true,
      finalResultLocked: true,
    },
    finalLeaderboardSnapshot: buildFinalLeaderboardSnapshot(
      room.teams,
      room.scores,
      now,
      resolveScoringMode(room.settings),
    ),
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
export function endQuizForTeams(room: RoomRecord, now = Date.now()): RoomRecord {
  return {
    ...room,
    phase: 'post_quiz',
    schedule:
      room.schedule?.enabled && !room.schedule.completedAt
        ? { ...room.schedule, completedAt: now }
        : room.schedule,
    settings: {
      ...room.settings,
      showLeaderboard: true,
      teamsLockedOut: true,
    },
  };
}

function redactRevealImageMediaUrl(question: Question, stripUrl: boolean): Question {
  if (!stripUrl || question.game?.gameId !== 'revealImage' || !question.media?.length) {
    return question;
  }
  return {
    ...question,
    media: question.media.map((item) =>
      item.type === 'image' ? { ...item, url: '' } : item,
    ),
  };
}

export function toPublicState(
  room: RoomState | RoomRecord,
  role: 'host' | 'secretary',
  viewerTeamId?: string,
): PublicRoomState {
  const withClock = { ...room, serverNow: Date.now() };
  const officialLeaderboard = computeLeaderboard(room);
  if (role === 'host') {
    return {
      ...withClock,
      viewerRole: 'host',
      leaderboard: officialLeaderboard,
    };
  }

  const teamId = viewerTeamId;
  const roomWithClock = withClock;
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
  const visibleRevealImageProgress = teamId
    ? (room.revealImageProgress ?? []).filter((entry) => entry.teamId === teamId)
    : [];
  const visibleGradingAssignments = assignment ? [assignment] : [];
  const leaderboardVisible = isProvisionalLeaderboardVisible(room.schedule, room.phase, {
    showLeaderboard: room.settings.showLeaderboard,
    finalResultLocked: room.settings.finalResultLocked,
    teamsLockedOut: room.settings.teamsLockedOut,
  });

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
    const stripRevealImageUrl =
      q.game?.gameId === 'revealImage' && room.questionStatus[q.id] === 'open';
    if (showReviewFasit || showGradingFasit || redacted.lines.length === 0) {
      return redactRevealImageMediaUrl(redacted, stripRevealImageUrl);
    }
    return redactRevealImageMediaUrl(
      hideTeamOnlySecrets({
        ...redacted,
        acceptedAnswers: undefined,
        options:
          redacted.type === 'mc'
            ? redacted.options?.map((o) => ({ ...o, isCorrect: false }))
          : undefined,
      }),
      stripRevealImageUrl,
    );
  });

  return {
    ...roomWithClock,
    questions,
    revealImageProgress: visibleRevealImageProgress,
    leaderboard: leaderboardVisible
      ? room.settings.finalResultLocked && room.finalLeaderboardSnapshot
        ? room.finalLeaderboardSnapshot.entries
        : officialLeaderboard
      : undefined,
    answeredByTeam: visibleAnsweredByTeam,
    teamQuestionLocks: teamId ? { [teamId]: room.teamQuestionLocks?.[teamId] ?? [] } : {},
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
    emailNotifyStatus:
      teamId && 'teamEmailNotify' in room
        ? toParticipantEmailNotifyStatus(
            (room as RoomRecord).teamEmailNotify?.[teamId],
          )
        : undefined,
  };
}
