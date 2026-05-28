import { describe, expect, it } from 'vitest';
import type { GameSubmission } from '../types.js';
import {
  buildRevealImageResults,
  calculateRevealImageScore,
  createDefaultRevealImageConfig,
  generateRevealImageTileColors,
  isRevealImageAnswerCorrect,
  normalizeRevealImageAnswer,
} from './revealImage.js';

describe('revealImage', () => {
  it('normalizes answers with spacing and case', () => {
    expect(normalizeRevealImageAnswer('  Ære   Være  ')).toBe('ære være');
  });

  it('generates opaque varied tile colors', () => {
    const colors = generateRevealImageTileColors(9, 'team-q1');
    expect(colors).toHaveLength(9);
    expect(new Set(colors).size).toBeGreaterThan(1);
    expect(colors.every((c) => c.startsWith('hsl(') && !c.includes('rgba'))).toBe(true);
  });

  it('matches accepted answers', () => {
    const config = createDefaultRevealImageConfig();
    config.correctAnswer = 'Kong Harald';
    config.acceptedAnswers = ['Harald V'];
    expect(isRevealImageAnswerCorrect('harald   v', config)).toBe(true);
    expect(isRevealImageAnswerCorrect('Kong Harald', config)).toBe(true);
    expect(isRevealImageAnswerCorrect('Kronprins', config)).toBe(false);
  });

  it('is case-insensitive for correct and alternative answers', () => {
    const config = createDefaultRevealImageConfig();
    config.correctAnswer = 'Erling Braut Haaland';
    config.acceptedAnswers = ['Håland', 'Erling'];
    expect(isRevealImageAnswerCorrect('HÅLAND', config)).toBe(true);
    expect(isRevealImageAnswerCorrect('ERLING BRAUT HAALAND', config)).toBe(true);
    expect(isRevealImageAnswerCorrect('erling', config)).toBe(true);
  });

  it('calculates free text score', () => {
    expect(
      calculateRevealImageScore({
        maxPoints: 100,
        totalTiles: 25,
        openedTiles: 5,
        usedChoices: false,
        choiceMultiplier: 0.6,
        minCorrectScore: 10,
      }),
    ).toBe(80);
  });

  it('calculates multiple choice score', () => {
    expect(
      calculateRevealImageScore({
        maxPoints: 100,
        totalTiles: 25,
        openedTiles: 5,
        usedChoices: true,
        choiceMultiplier: 0.6,
        minCorrectScore: 10,
      }),
    ).toBe(48);
  });

  it('respects minimum score even on full reveal', () => {
    expect(
      calculateRevealImageScore({
        maxPoints: 100,
        totalTiles: 25,
        openedTiles: 25,
        usedChoices: true,
        choiceMultiplier: 0.6,
        minCorrectScore: 10,
      }),
    ).toBe(10);
  });

  it('scores only correct submissions and keeps best team score', () => {
    const config = createDefaultRevealImageConfig();
    config.correctAnswer = 'Oslo';
    const submissions: GameSubmission[] = [
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'revealImage',
        payload: {
          gameId: 'revealImage',
          answer: 'Bergen',
          openedTiles: 2,
          totalTiles: 25,
          usedChoices: false,
          source: 'text',
        },
        submittedAt: 1,
        serverReceivedAt: 1,
      },
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'revealImage',
        payload: {
          gameId: 'revealImage',
          answer: 'Oslo',
          openedTiles: 5,
          totalTiles: 25,
          usedChoices: true,
          source: 'choice',
        },
        submittedAt: 2,
        serverReceivedAt: 2,
      },
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'revealImage',
        payload: {
          gameId: 'revealImage',
          answer: 'Oslo',
          openedTiles: 3,
          totalTiles: 25,
          usedChoices: false,
          source: 'text',
        },
        submittedAt: 3,
        serverReceivedAt: 3,
      },
    ];
    const results = buildRevealImageResults('q1', 100, config, submissions);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ teamId: 'a', quizPoints: 88 });
  });
});
