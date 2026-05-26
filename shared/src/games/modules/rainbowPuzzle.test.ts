import { describe, expect, it } from 'vitest';
import {
  buildRainbowPuzzleResults,
  createDefaultRainbowPuzzleConfig,
} from './rainbowPuzzle.js';
import type { GameSubmission } from '../types.js';

describe('buildRainbowPuzzleResults', () => {
  it('ranks highest score first and awards top 3 points', () => {
    const config = createDefaultRainbowPuzzleConfig();
    const submissions: GameSubmission[] = [
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'rainbowPuzzle',
        payload: { gameId: 'rainbowPuzzle', score: 500 },
        submittedAt: 1,
        serverReceivedAt: 1,
      },
      {
        questionId: 'q1',
        teamId: 'b',
        gameId: 'rainbowPuzzle',
        payload: { gameId: 'rainbowPuzzle', score: 900 },
        submittedAt: 2,
        serverReceivedAt: 2,
      },
      {
        questionId: 'q1',
        teamId: 'c',
        gameId: 'rainbowPuzzle',
        payload: { gameId: 'rainbowPuzzle', score: 700 },
        submittedAt: 3,
        serverReceivedAt: 3,
      },
      {
        questionId: 'q1',
        teamId: 'd',
        gameId: 'rainbowPuzzle',
        payload: { gameId: 'rainbowPuzzle', score: 300 },
        submittedAt: 4,
        serverReceivedAt: 4,
      },
    ];

    expect(buildRainbowPuzzleResults('q1', 5, config, submissions)).toMatchObject([
      { teamId: 'b', rankValue: 900, rank: 1, quizPoints: 5 },
      { teamId: 'c', rankValue: 700, rank: 2, quizPoints: 3 },
      { teamId: 'a', rankValue: 500, rank: 3, quizPoints: 1 },
      { teamId: 'd', rankValue: 300, rank: 4, quizPoints: 0 },
    ]);
  });

  it('uses each teams best score and gives ties the same points', () => {
    const config = createDefaultRainbowPuzzleConfig();
    const submissions: GameSubmission[] = [
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'rainbowPuzzle',
        payload: { gameId: 'rainbowPuzzle', score: 200 },
        submittedAt: 1,
        serverReceivedAt: 1,
      },
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'rainbowPuzzle',
        payload: { gameId: 'rainbowPuzzle', score: 800 },
        submittedAt: 2,
        serverReceivedAt: 2,
      },
      {
        questionId: 'q1',
        teamId: 'b',
        gameId: 'rainbowPuzzle',
        payload: { gameId: 'rainbowPuzzle', score: 800 },
        submittedAt: 3,
        serverReceivedAt: 3,
      },
    ];

    expect(buildRainbowPuzzleResults('q1', 5, config, submissions)).toMatchObject([
      { teamId: 'a', rankValue: 800, rank: 1, quizPoints: 5 },
      { teamId: 'b', rankValue: 800, rank: 1, quizPoints: 5 },
    ]);
  });
});
