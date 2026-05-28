import { describe, expect, it } from 'vitest';
import { createDefaultRevealImageConfig } from '../games/modules/revealImage.js';
import type { Question } from '../types/room.js';
import {
  clampQuizPointsPerQuestion,
  DEFAULT_RANKED_POINT_BANDS,
  normalizeQuestionScoring,
  QUIZ_MAX_POINTS_PER_QUESTION,
} from './quizScoring.js';

describe('quizScoring', () => {
  it('clamps quiz points to max per question', () => {
    expect(clampQuizPointsPerQuestion(100)).toBe(QUIZ_MAX_POINTS_PER_QUESTION);
    expect(clampQuizPointsPerQuestion(-2)).toBe(0);
  });

  it('migrates legacy reveal image direct score to ranked bands', () => {
    const legacyGame = {
      ...createDefaultRevealImageConfig(),
      resultKind: 'directScore' as const,
      pointMode: 'directScoreToPoints' as const,
    };
    const question: Question = {
      id: 'q1',
      order: 0,
      type: 'game',
      gameType: 'revealImage',
      lines: [{ text: 'Avslør', style: 'title' }],
      game: legacyGame,
      maxPoints: 100,
    };

    const normalized = normalizeQuestionScoring(question);
    expect(normalized.maxPoints).toBe(5);
    expect(normalized.game?.gameId).toBe('revealImage');
    if (normalized.game?.gameId === 'revealImage') {
      expect(normalized.game.resultKind).toBe('ranked');
      expect(normalized.game.pointMode).toBe('rankedBands');
      expect(normalized.game.pointBands).toEqual(DEFAULT_RANKED_POINT_BANDS);
    }
  });
});
