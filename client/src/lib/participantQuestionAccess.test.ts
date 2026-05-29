import { describe, expect, it } from 'vitest';
import {
  getParticipantQuestionViewState,
  participantQuestionLockedMessage,
} from './participantQuestionAccess';
import type { PublicRoomState, Question } from '@quiz-tool/shared';

function baseRoom(overrides: Partial<PublicRoomState> = {}): PublicRoomState {
  return {
    id: 'room1',
    joinCode: 'ABC',
    phase: 'live',
    teams: [{ id: 't1', name: 'Lag 1' }],
    questions: [],
    questionStatus: {},
    questionsActivated: {},
    answers: [],
    scores: [],
    gameRounds: [],
    gameStarts: [],
    gameSubmissions: [],
    gameResults: [],
    answeredByTeam: {},
    gradingAssignments: [],
    peerGrades: [],
    protests: [],
    settings: {
      showLeaderboard: true,
      teamReviewOpen: false,
      answerKeyOpen: false,
      finalResultLocked: false,
      teamsLockedOut: false,
      testMode: false,
    },
    schedule: undefined,
    teamQuestionLocks: {},
    ...overrides,
  } as PublicRoomState;
}

const openQuestion: Question = {
  id: 'q1',
  order: 0,
  type: 'open',
  lines: [{ text: 'Q', style: 'title' }],
  acceptedAnswers: ['a'],
  maxPoints: 1,
};

describe('participantQuestionAccess', () => {
  it('returns locked when hosted question is not open', () => {
    const room = baseRoom({
      questionStatus: { q1: 'locked' },
      questions: [openQuestion],
    });
    expect(getParticipantQuestionViewState(room, 't1', openQuestion)).toBe('locked');
    expect(participantQuestionLockedMessage('locked')).toMatch(/ikke åpnet/i);
  });

  it('returns available when hosted question is open and revealed', () => {
    const room = baseRoom({
      questionStatus: { q1: 'open' },
      questions: [openQuestion],
    });
    expect(getParticipantQuestionViewState(room, 't1', openQuestion)).toBe('available');
  });

  it('returns submitted for self-paced locked non-game', () => {
    const room = baseRoom({
      schedule: { enabled: true, deliveryMode: 'self_paced', runMode: 'manual' },
      teamQuestionLocks: { t1: ['q1'] },
      questions: [openQuestion],
    });
    expect(getParticipantQuestionViewState(room, 't1', openQuestion)).toBe('submitted');
  });
});
