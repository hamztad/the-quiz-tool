import { describe, expect, it } from 'vitest';
import {
  canTeamWorkOnQuestion,
  isProvisionalLeaderboardVisible,
  isSelfPacedQuiz,
  isTeamQuestionLocked,
} from './quizModes.js';

describe('isSelfPacedQuiz', () => {
  it('is true when schedule enabled with self_paced', () => {
    expect(
      isSelfPacedQuiz({ enabled: true, deliveryMode: 'self_paced', runMode: 'manual' }),
    ).toBe(true);
  });
});

describe('isTeamQuestionLocked', () => {
  it('detects per-team locks', () => {
    expect(isTeamQuestionLocked({ t1: ['q1'] }, 't1', 'q1')).toBe(true);
    expect(isTeamQuestionLocked({ t1: ['q1'] }, 't1', 'q2')).toBe(false);
  });
});

describe('canTeamWorkOnQuestion', () => {
  const schedule = { enabled: true, deliveryMode: 'self_paced' as const, runMode: 'manual' as const };

  it('allows games while live', () => {
    expect(
      canTeamWorkOnQuestion(schedule, 'live', false, {}, 't1', { id: 'g1', type: 'game' }),
    ).toBe(true);
  });

  it('blocks locked non-game', () => {
    expect(
      canTeamWorkOnQuestion(schedule, 'live', false, { t1: ['q1'] }, 't1', {
        id: 'q1',
        type: 'open',
      }),
    ).toBe(false);
  });
});

describe('isProvisionalLeaderboardVisible', () => {
  const schedule = { enabled: true, deliveryMode: 'self_paced' as const, runMode: 'manual' as const };

  it('shows during live self-paced', () => {
    expect(
      isProvisionalLeaderboardVisible(schedule, 'live', {
        showLeaderboard: false,
        finalResultLocked: false,
      }),
    ).toBe(true);
  });
});
