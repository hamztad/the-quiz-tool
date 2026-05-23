import type { Question, RoomState } from '@quiz-tool/shared';
import { MAX_TEAMS, validateQuestionsForSave } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/RoomStore.js';
import { generateId, generateJoinCode, generateToken } from '../utils/id.js';

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
    answeredByTeam: {},
    answers: [],
    scores: [],
    gradingAssignments: [],
    peerGrades: [],
    protests: [],
    settings: { showLeaderboard: false },
    hostToken,
    teamTokens: {},
  };

  void title;
  return room;
}

export function joinTeam(room: RoomRecord, teamName: string): { room: RoomRecord; teamId: string; teamToken: string } {
  if (room.teams.length >= MAX_TEAMS) {
    throw new Error('Maks antall lag er nådd.');
  }

  const trimmed = teamName.trim();
  if (!trimmed) {
    throw new Error('Lagnavn kan ikke være tomt.');
  }

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

export function setQuestions(room: RoomRecord, questions: Question[]): RoomRecord {
  const validationErrors = validateQuestionsForSave(questions);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(' '));
  }

  const questionStatus: Record<string, 'locked' | 'open'> = {};
  questions.forEach((q) => {
    questionStatus[q.id] = 'locked';
  });

  return {
    ...room,
    questions: questions.map((q, i) => ({ ...q, order: i })),
    questionStatus,
    answers: [],
    scores: [],
    answeredByTeam: Object.fromEntries(room.teams.map((t) => [t.id, []])),
    gradingAssignments: [],
    peerGrades: [],
    protests: [],
  };
}

export function startQuiz(room: RoomRecord): RoomRecord {
  if (room.questions.length === 0) {
    throw new Error('Legg til spørsmål før du starter quizen.');
  }
  return { ...room, phase: 'live' };
}

export function toPublicState(
  room: RoomState,
  role: 'host' | 'secretary',
  viewerTeamId?: string,
): RoomState & { viewerRole: 'host' | 'secretary'; viewerTeamId?: string } {
  if (role === 'host') {
    const hostAnswers = room.answers.map((a) => ({
      teamId: a.teamId,
      questionId: a.questionId,
      value: '[hidden]',
      updatedAt: a.updatedAt,
    }));
    return {
      ...room,
      answers: hostAnswers,
      viewerRole: 'host',
    };
  }

  const teamId = viewerTeamId;
  const assignment = room.gradingAssignments.find((g) => g.graderTeamId === teamId);

  let visibleAnswers = room.answers.filter((a) => a.teamId === teamId);

  if (room.phase === 'grading' && assignment) {
    const targetAnswers = room.answers.filter(
      (a) => a.teamId === assignment.targetTeamId && assignment.questionIds.includes(a.questionId),
    );
    visibleAnswers = [...visibleAnswers, ...targetAnswers];
  }

  return {
    ...room,
    answers: visibleAnswers,
    viewerRole: 'secretary',
    viewerTeamId: teamId,
  };
}
