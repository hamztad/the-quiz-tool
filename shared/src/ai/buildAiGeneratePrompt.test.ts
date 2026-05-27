import { describe, expect, it } from 'vitest';
import { buildAiGeneratePrompt } from './buildAiGeneratePrompt.js';
import { parseAiQuizJson, validateAiQuestionStyle } from './parseAiQuizJson.js';

const base = {
  roomId: 'r1',
  topic: 'Sport',
  questionCount: 4,
  difficulty: 'medium' as const,
};

describe('buildAiGeneratePrompt', () => {
  it('requires only open when open is selected', () => {
    const prompt = buildAiGeneratePrompt({ ...base, questionStyle: 'open' });
    expect(prompt).toContain('ALLE 4 spørsmål skal ha "type": "open"');
    expect(prompt).toContain('FORBUDT: "type": "mc"');
    expect(prompt).toContain('"acceptedAnswers"');
  });

  it('requires only mc when mc is selected', () => {
    const prompt = buildAiGeneratePrompt({ ...base, questionStyle: 'mc' });
    expect(prompt).toContain('ALLE 4 spørsmål skal ha "type": "mc"');
    expect(prompt).toContain('FORBUDT: "type": "open"');
    expect(prompt).toContain('"options"');
  });

  it('lists alternating types for mixed', () => {
    const prompt = buildAiGeneratePrompt({ ...base, questionStyle: 'mixed' });
    expect(prompt).toContain('Spørsmål 1: type "open"');
    expect(prompt).toContain('Spørsmål 2: type "mc"');
  });

  it('requires exact five-slot quiz package structure', () => {
    const prompt = buildAiGeneratePrompt({ ...base, questionStyle: 'quizPackage' });
    expect(prompt).toContain('nøyaktig 5 spørsmål');
    expect(prompt).toContain('type "ordering"');
    expect(prompt).toContain('puzzleType enten "anagram" ELLER "mathRace"');
    expect(prompt).toContain('maks 7 bokstaver per ord');
    expect(prompt).toContain('gameId enten "rainbowPuzzle", "emojiHunt" eller "dropBall"');
    expect(prompt).toContain('ekte, etablert norsk ord');
    expect(prompt).toContain('Spillnavn må være nøyaktige');
  });
});

describe('validateAiQuestionStyle', () => {
  const openQ = {
    type: 'open' as const,
    lines: [{ text: 'Q', style: 'title' as const }],
    acceptedAnswers: ['A'],
    maxPoints: 1,
  };
  const mcQ = {
    type: 'mc' as const,
    lines: [{ text: 'Q', style: 'title' as const }],
    options: [
      { id: '1', text: 'A', isCorrect: true },
      { id: '2', text: 'B', isCorrect: false },
      { id: '3', text: 'C', isCorrect: false },
      { id: '4', text: 'D', isCorrect: false },
    ],
    maxPoints: 1,
  };

  it('rejects mc in open-only mode via parseAiQuizJson', () => {
    const result = parseAiQuizJson(
      JSON.stringify({
        questions: [
          { type: 'open', text: 'Q1', acceptedAnswers: ['A'] },
          { type: 'mc', text: 'Q2', options: [
            { text: 'A', correct: true },
            { text: 'B', correct: false },
            { text: 'C', correct: false },
            { text: 'D', correct: false },
          ]},
        ],
      }),
      'open',
    );
    expect(result.questions).toHaveLength(0);
    expect(result.errors.some((e) => e.includes('flervalg'))).toBe(true);
  });

  it('accepts mc-only', () => {
    expect(validateAiQuestionStyle([mcQ, mcQ], 'mc')).toEqual([]);
  });
});
