import { describe, expect, it } from 'vitest';
import {
  buildAnagramResults,
  createAnagramConfigForAnswer,
  isAnagramAnswerCorrect,
  normalizeAnagramAnswer,
  scrambleAnagramText,
  validateAnagramAnswerText,
} from './anagram.js';
import type { GameSubmission } from '../types.js';

describe('anagram', () => {
  it('scrambles one word', () => {
    const scrambled = scrambleAnagramText('KODER', 1);
    expect(scrambled).not.toBe('KODER');
    expect([...scrambled].sort()).toEqual([...'KODER'].sort());
  });

  it('scrambles multiple words per word and preserves spaces', () => {
    const scrambled = scrambleAnagramText('DET ER FINT', 3);
    const words = scrambled.split(' ');
    expect(words).toHaveLength(3);
    expect(words[0]).not.toContain(' ');
    expect([...words[0]].sort()).toEqual([...'DET'].sort());
    expect([...words[1]].sort()).toEqual([...'ER'].sort());
    expect([...words[2]].sort()).toEqual([...'FINT'].sort());
  });

  it('validates max 20 letters', () => {
    expect(validateAnagramAnswerText('ABCDEFGHIJKLMNOPQRST').ok).toBe(true);
    expect(validateAnagramAnswerText('ABCDEFGHIJKLMNOPQRSTU').ok).toBe(false);
  });

  it('validates max 4 words', () => {
    expect(validateAnagramAnswerText('TO TRE FIRE FEM').ok).toBe(true);
    expect(validateAnagramAnswerText('TO TRE FIRE FEM SEKS').ok).toBe(false);
  });

  it('warns when a word exceeds recommended length per word', () => {
    const short = validateAnagramAnswerText('DET ER FINT');
    expect(short.warnings).toEqual([]);

    const long = validateAnagramAnswerText('KARAKTER');
    expect(long.ok).toBe(true);
    expect(long.warnings.some((w) => w.includes('7 bokstaver per ord'))).toBe(true);
  });

  it('normalizes answers case, spaces and punctuation', () => {
    expect(normalizeAnagramAnswer('  Ære,  ØL!  ÅS  ')).toBe('ære øl ås');
    expect(isAnagramAnswerCorrect('det   er fint!', 'DET ER FINT')).toBe(true);
  });

  it('scores correct answers', () => {
    const config = createAnagramConfigForAnswer('DET ER FINT');
    const submissions: GameSubmission[] = [
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'anagram',
        payload: { gameId: 'anagram', answer: 'det er fint' },
        submittedAt: 1,
        serverReceivedAt: 1,
      },
    ];

    expect(buildAnagramResults('q1', 2, config, submissions)).toMatchObject([
      { teamId: 'a', quizPoints: 2, displayValue: 'Riktig svar' },
    ]);
  });

  it('scores incorrect answers as zero', () => {
    const config = createAnagramConfigForAnswer('DET ER FINT');
    const submissions: GameSubmission[] = [
      {
        questionId: 'q1',
        teamId: 'a',
        gameId: 'anagram',
        payload: { gameId: 'anagram', answer: 'det er feil' },
        submittedAt: 1,
        serverReceivedAt: 1,
      },
    ];

    expect(buildAnagramResults('q1', 2, config, submissions)).toMatchObject([
      { teamId: 'a', quizPoints: 0, displayValue: 'Feil svar' },
    ]);
  });
});
