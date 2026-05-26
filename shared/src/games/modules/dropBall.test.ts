import { describe, expect, it } from 'vitest';
import {
  buildDropBallResults,
  calculateDropBallBoardScore,
  calculateDropBallMaxScore,
  createDefaultDropBallConfig,
  sanitizeDropBallRounds,
} from './dropBall.js';
import type { GameSubmission } from '../types.js';

describe('dropBall', () => {
  it('scores airtime, obstacle chain, coins and completion bonuses', () => {
    const config = createDefaultDropBallConfig();

    expect(calculateDropBallBoardScore(config, 'normal', 7000, 3, [1000], 0)).toMatchObject({
      airTimeMs: 7000,
      obstacleHits: 3,
      obstaclePoints: 600,
      coinPoints: 1000,
      allCoinsBonus: 0,
      allObstaclesBonus: 0,
      perfectBoardBonus: 0,
      score: 8600,
      unlockedBonus: false,
    });
    expect(calculateDropBallBoardScore(config, 'bonus', 12_000, 14, [1000, 2000, 3000], 1)).toMatchObject({
      airTimeMs: 12_000,
      obstacleHits: 14,
      obstaclePoints: 10_500,
      coinPoints: 6000,
      allCoinsBonus: 5000,
      allObstaclesBonus: 10_000,
      perfectBoardBonus: 25_000,
      score: 68_500,
      unlockedBonus: true,
    });
    expect(calculateDropBallMaxScore(config)).toBe(519_000);
  });

  it('sanitizes client board breakdowns', () => {
    const config = createDefaultDropBallConfig();

    expect(sanitizeDropBallRounds([
      {
        roundIndex: 9,
        ballKind: 'bonus',
        airTimeMs: 99_000,
        obstacleHits: 99,
        coinValues: [1000, 1000, 2000, 3000, 99_000],
        obstaclePoints: 0,
        coinPoints: 0,
        allCoinsBonus: 0,
        allObstaclesBonus: 0,
        perfectBoardBonus: 0,
        score: 0,
        unlockedBonus: false,
      },
    ], config)).toMatchObject([
      {
        roundIndex: 0,
        airTimeMs: 30_000,
        obstacleHits: 14,
        coinValues: [1000, 2000, 3000],
        score: 86_500,
      },
    ]);
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
