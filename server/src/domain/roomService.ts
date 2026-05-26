import type { PublicRoomState, Question, RoomState } from '@quiz-tool/shared';
import { isQuestionRevealedToTeam, redactQuestionForTeam } from '@quiz-tool/shared';
import { MAX_TEAMS, validateQuestionsForSave, validateTeamName } from '@quiz-tool/shared';
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
    settings: { showLeaderboard: false, teamReviewOpen: false, answerKeyOpen: false },
    hostToken,
    teamTokens: {},
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };

  void title;
  return room;
}

export function joinTeam(room: RoomRecord, teamName: string): { room: RoomRecord; teamId: string; teamToken: string } {
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

  const updated: RoomRecord = {
    ...room,
    teams: [...room.teams, { id: teamId, name: trimmed }],
    answeredByTeam: { ...room.answeredByTeam, [teamId]: [] },
    teamTokens: { ...room.teamTokens, [teamId]: teamToken },
  };

  return { room: updated, teamId, teamToken };
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

  const questions = room.questions.map((q) => {
    if (answerKeyOpen) return q;
    const showReviewFasit = teamReviewOpen && ownAnsweredQuestionIds.has(q.id);
    const showGradingFasit = assignedQuestionIds.has(q.id);
    const revealed = isQuestionRevealedToTeam(room, q.id) || showReviewFasit || showGradingFasit;
    const redacted = redactQuestionForTeam(q, revealed);
    if (showReviewFasit || showGradingFasit || redacted.lines.length === 0) {
      return redacted;
    }
    return {
      ...redacted,
      acceptedAnswers: undefined,
      options:
        redacted.type === 'mc'
          ? redacted.options?.map((o) => ({ ...o, isCorrect: false }))
          : undefined,
    };
  });

  return {
    ...room,
    questions,
    leaderboard: computeLeaderboard(room),
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
