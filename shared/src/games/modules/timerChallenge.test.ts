import { describe, expect, it } from 'vitest';
import {
  buildTimerChallengeResults,
  createDefaultTimerChallengeConfig,
} from './timerChallenge.js';
import type { GameSubmission } from '../types.js';

describe('buildTimerChallengeResults', () => {
  it('ranks teams closest to target time lowest first', () => {
    const config = createDefaultTimerChallengeConfig();
    const submissions: GameSubmission[] = [
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'timerChallenge',
        payload: { gameId: 'timerChallenge', elapsedMs: 9_700 },
        submittedAt: 1,
        serverReceivedAt: 1,
      },
      {
        questionId: 'q1',
        teamId: 'b',
        gameId: 'timerChallenge',
        payload: { gameId: 'timerChallenge', elapsedMs: 10_100 },
        submittedAt: 2,
        serverReceivedAt: 2,
      },
    ];

    expect(buildTimerChallengeResults('q1', 2, config, submissions)).toMatchObject([
      { teamId: 'b', rankValue: 100, rank: 1, quizPoints: 2 },
      { teamId: 'a', rankValue: 300, rank: 2, quizPoints: 0 },
    ]);
  });
});
