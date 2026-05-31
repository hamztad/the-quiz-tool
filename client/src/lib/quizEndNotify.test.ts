import { describe, expect, it } from 'vitest';
import {
  detectQuizEndNotifyEvents,
  isQuizEndedForTeams,
  snapshotQuizEndNotifyState,
} from './quizEndNotify.js';
import type { PublicRoomState } from '@quiz-tool/shared';

function room(partial: Partial<PublicRoomState>): PublicRoomState {
  return {
    id: 'r1',
    joinCode: 'ABC',
    phase: 'live',
    teams: [],
    teamPresence: {},
    questions: [],
    questionStatus: {},
    answers: [],
    scores: [],
    protests: [],
    peerGrades: [],
    aiGrades: [],
    gameSubmissions: [],
    gradingAssignments: [],
    answeredByTeam: {},
    teamQuestionLocks: {},
    settings: {
      showLeaderboard: true,
      teamReviewOpen: false,
      answerKeyOpen: false,
      allowNewTeams: true,
      finalResultLocked: false,
      openAnswerGradingMode: 'peer',
    },
    serverNow: 0,
    viewerRole: 'secretary',
    leaderboard: [],
    ...partial,
  } as PublicRoomState;
}

describe('quizEndNotify', () => {
  it('detects quiz end when phase becomes post_quiz', () => {
    const base = room({});
    const prev = snapshotQuizEndNotifyState(room({ phase: 'live' }));
    const next = snapshotQuizEndNotifyState(
      room({
        phase: 'post_quiz',
        settings: { ...base.settings, teamsLockedOut: true },
      }),
    );
    expect(isQuizEndedForTeams(prev)).toBe(false);
    expect(isQuizEndedForTeams(next)).toBe(true);
    expect(detectQuizEndNotifyEvents(prev, next, true)).toEqual(['quiz_ended']);
  });

  it('detects final result lock', () => {
    const base = room({ phase: 'post_quiz' });
    const prev = snapshotQuizEndNotifyState(
      room({ phase: 'post_quiz', settings: { ...base.settings, finalResultLocked: false } }),
    );
    const next = snapshotQuizEndNotifyState(
      room({
        phase: 'post_quiz',
        settings: { ...base.settings, finalResultLocked: true, teamsLockedOut: true },
      }),
    );
    expect(detectQuizEndNotifyEvents(prev, next, true)).toEqual(['final_result_locked']);
  });

  it('does not fire before initialized', () => {
    const next = snapshotQuizEndNotifyState(room({ phase: 'post_quiz' }));
    expect(detectQuizEndNotifyEvents(null, next, false)).toEqual([]);
  });
});
