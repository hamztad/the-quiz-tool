import { describe, expect, it } from 'vitest';
import {
  buildDropBallResults,
  calculateDropBallMaxScore,
  calculateDropBallRoundScore,
  createDefaultDropBallConfig,
} from './dropBall.js';
import type { GameSubmission } from '../types.js';

describe('dropBall', () => {
  it('scores normal and bonus jackpot drops', () => {
    const config = createDefaultDropBallConfig();

    expect(calculateDropBallRoundScore(config, 3, 'normal')).toMatchObject({
      slotIndex: 3,
      baseScore: 500,
      multiplier: 1,
      jackpotBonus: 0,
      score: 500,
      unlockedBonus: true,
    });
    expect(calculateDropBallRoundScore(config, 3, 'bonus')).toMatchObject({
      slotIndex: 3,
      baseScore: 500,
      multiplier: 3,
      jackpotBonus: 1000,
      score: 2500,
      unlockedBonus: false,
    });
    expect(calculateDropBallMaxScore(config)).toBe(3500);
  });

  it('uses each teams best score and awards top 3 points', () => {
    const config = createDefaultDropBallConfig();
    const submissions: GameSubmission[] = [
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'dropBall',
        payload: { gameId: 'dropBall', score: 600 },
        submittedAt: 1,
        serverReceivedAt: 1,
      },
      {
        questionId: 'q1',
        teamId: 'b',
        gameId: 'dropBall',
        payload: { gameId: 'dropBall', score: 1200 },
        submittedAt: 2,
        serverReceivedAt: 2,
      },
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'dropBall',
        payload: { gameId: 'dropBall', score: 1600 },
        submittedAt: 3,
        serverReceivedAt: 3,
      },
      {
        questionId: 'q1',
        teamId: 'c',
        gameId: 'dropBall',
        payload: { gameId: 'dropBall', score: 300 },
        submittedAt: 4,
        serverReceivedAt: 4,
      },
      {
        questionId: 'q1',
        teamId: 'd',
        gameId: 'dropBall',
        payload: { gameId: 'dropBall', score: 100 },
        submittedAt: 5,
        serverReceivedAt: 5,
      },
    ];

    expect(buildDropBallResults('q1', 5, config, submissions)).toMatchObject([
      { teamId: 'a', rankValue: 1600, rank: 1, quizPoints: 5 },
      { teamId: 'b', rankValue: 1200, rank: 2, quizPoints: 3 },
      { teamId: 'c', rankValue: 300, rank: 3, quizPoints: 1 },
      { teamId: 'd', rankValue: 100, rank: 4, quizPoints: 0 },
    ]);
  });
});
