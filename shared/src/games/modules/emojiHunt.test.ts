import { describe, expect, it } from 'vitest';
import {
  buildEmojiHuntResults,
  calculateEmojiHuntTotalMs,
  createDefaultEmojiHuntConfig,
} from './emojiHunt.js';
import type { GameSubmission } from '../types.js';

describe('emojiHunt', () => {
  it('caps each target at the configured timeout', () => {
    expect(calculateEmojiHuntTotalMs([1_200, 12_000, 8_400], 10_000)).toBe(19_600);
  });

  it('ranks lowest time first and awards top 3 points', () => {
    const config = createDefaultEmojiHuntConfig();
    const submissions: GameSubmission[] = [
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'emojiHunt',
        payload: { gameId: 'emojiHunt', totalMs: 9_000 },
        submittedAt: 1,
        serverReceivedAt: 1,
      },
      {
        questionId: 'q1',
        teamId: 'b',
        gameId: 'emojiHunt',
        payload: { gameId: 'emojiHunt', totalMs: 5_500 },
        submittedAt: 2,
        serverReceivedAt: 2,
      },
      {
        questionId: 'q1',
        teamId: 'c',
        gameId: 'emojiHunt',
        payload: { gameId: 'emojiHunt', totalMs: 7_200 },
        submittedAt: 3,
        serverReceivedAt: 3,
      },
      {
        questionId: 'q1',
        teamId: 'd',
        gameId: 'emojiHunt',
        payload: { gameId: 'emojiHunt', totalMs: 11_000 },
        submittedAt: 4,
        serverReceivedAt: 4,
      },
    ];

    expect(buildEmojiHuntResults('q1', 5, config, submissions)).toMatchObject([
      { teamId: 'b', rankValue: 5_500, rank: 1, quizPoints: 5 },
      { teamId: 'c', rankValue: 7_200, rank: 2, quizPoints: 3 },
      { teamId: 'a', rankValue: 9_000, rank: 3, quizPoints: 1 },
      { teamId: 'd', rankValue: 11_000, rank: 4, quizPoints: 0 },
    ]);
  });

  it('uses each teams best attempt and keeps ties on same rank', () => {
    const config = createDefaultEmojiHuntConfig();
    const submissions: GameSubmission[] = [
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'emojiHunt',
        payload: { gameId: 'emojiHunt', totalMs: 8_000 },
        submittedAt: 1,
        serverReceivedAt: 1,
      },
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'emojiHunt',
        payload: { gameId: 'emojiHunt', totalMs: 5_000 },
        submittedAt: 2,
        serverReceivedAt: 2,
      },
      {
        questionId: 'q1',
        teamId: 'b',
        gameId: 'emojiHunt',
        payload: { gameId: 'emojiHunt', totalMs: 5_000 },
        submittedAt: 3,
        serverReceivedAt: 3,
      },
    ];

    expect(buildEmojiHuntResults('q1', 5, config, submissions)).toMatchObject([
      { teamId: 'a', rankValue: 5_000, rank: 1, quizPoints: 5 },
      { teamId: 'b', rankValue: 5_000, rank: 1, quizPoints: 5 },
    ]);
  });
});
