import { describe, expect, it } from 'vitest';
import type { Question } from '@quiz-tool/shared';
import { lockQuestion, openQuestion } from './questionService.js';
import type { RoomRecord } from '../store/roomStoreTypes.js';

function mcQuestion(id: string, shuffle: boolean): Question {
  return {
    id,
    order: 0,
    type: 'mc',
    lines: [{ text: 'Test', style: 'title' }],
    options: [
      { id: 'o1', text: 'En', isCorrect: true },
      { id: 'o2', text: 'To', isCorrect: false },
      { id: 'o3', text: 'Tre', isCorrect: false },
      { id: 'o4', text: 'Fire', isCorrect: false },
    ],
    shuffleMcOptionsOnOpen: shuffle ? true : undefined,
    maxPoints: 1,
  };
}

function baseRoom(question: Question): RoomRecord {
  const now = Date.now();
  return {
    id: 'room1',
    joinCode: 'ABCD',
    phase: 'live',
    teams: [],
    teamPresence: {},
    questions: [question],
    questionStatus: { [question.id]: 'locked' },
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
      teamsLockedOut: true,
      openAnswerGradingMode: 'peer',
    },
    hostToken: 'h',
    teamTokens: {},
    teamBrowserTokens: {},
    expiresAt: now + 60_000,
    createdAt: now,
    lastActiveAt: now,
    hostPresence: { connected: false, lastSeenAt: now },
  };
}

describe('openQuestion MC shuffle', () => {
  it('sets mcDisplayOptionOrder when shuffleMcOptionsOnOpen is enabled', () => {
    const q = mcQuestion('q1', true);
    const opened = openQuestion(baseRoom(q), 'q1', { allowWhenTeamsLockedOut: true });
    const order = opened.mcDisplayOptionOrder?.q1;
    expect(order).toHaveLength(4);
    expect(new Set(order)).toEqual(new Set(['o1', 'o2', 'o3', 'o4']));
  });

  it('regenerates order on reopen after lock', () => {
    const q = mcQuestion('q1', true);
    let room = openQuestion(baseRoom(q), 'q1', { allowWhenTeamsLockedOut: true });
    const first = room.mcDisplayOptionOrder?.q1?.join(',');
    room = lockQuestion(room, 'q1');
    expect(room.mcDisplayOptionOrder?.q1).toBeUndefined();
    room = openQuestion(room, 'q1', { allowWhenTeamsLockedOut: true });
    const second = room.mcDisplayOptionOrder?.q1?.join(',');
    expect(second).toBeTruthy();
    // Not guaranteed different, but order should exist again
    expect(room.mcDisplayOptionOrder?.q1).toHaveLength(4);
    expect(first).toBeTruthy();
  });

  it('skips mcDisplayOptionOrder when shuffle is off', () => {
    const q = mcQuestion('q1', false);
    const opened = openQuestion(baseRoom(q), 'q1', { allowWhenTeamsLockedOut: true });
    expect(opened.mcDisplayOptionOrder?.q1).toBeUndefined();
  });
});
