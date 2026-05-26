import { describe, expect, it } from 'vitest';
import { parseAiQuizJson } from './parseAiQuizJson.js';

const validOpen = {
  type: 'open',
  text: 'Hva er hovedstaden i Norge?',
  acceptedAnswers: ['Oslo'],
};

const validMc = {
  type: 'mc',
  text: 'Hvilken planet er nærmest solen?',
  options: [
    { text: 'Merkur', correct: true },
    { text: 'Venus', correct: false },
    { text: 'Mars', correct: false },
    { text: 'Jupiter', correct: false },
  ],
};

describe('parseAiQuizJson', () => {
  it('parses valid open and mc questions', () => {
    const result = parseAiQuizJson(
      JSON.stringify({ questions: [validOpen, validMc] }),
    );
    expect(result.errors).toEqual([]);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]?.type).toBe('open');
    expect(result.questions[1]?.options).toHaveLength(4);
    expect(result.questions[1]?.options?.filter((o) => o.isCorrect)).toHaveLength(1);
  });

  it('rejects invalid JSON', () => {
    const result = parseAiQuizJson('not json');
    expect(result.questions).toHaveLength(0);
    expect(result.errors[0]).toMatch(/JSON/);
  });

  it('rejects mc without exactly one correct option', () => {
    const result = parseAiQuizJson(
      JSON.stringify({
        questions: [
          {
            type: 'mc',
            text: 'Test?',
            options: [
              { text: 'A', correct: true },
              { text: 'B', correct: true },
              { text: 'C', correct: false },
              { text: 'D', correct: false },
            ],
          },
          validOpen,
        ],
      }),
    );
    expect(result.questions).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects more than 10 questions', () => {
    const questions = Array.from({ length: 11 }, () => validOpen);
    const result = parseAiQuizJson(JSON.stringify({ questions }));
    expect(result.questions).toHaveLength(0);
    expect(result.errors.some((e) => e.includes('10'))).toBe(true);
  });

  it('rejects self-referencing invalid open without answers', () => {
    const result = parseAiQuizJson(
      JSON.stringify({ questions: [{ type: 'open', text: 'Q?' }] }),
    );
    expect(result.questions).toHaveLength(0);
  });

  it('parses optional body text as internal body lines', () => {
    const result = parseAiQuizJson(
      JSON.stringify({
        questions: [{ ...validOpen, body: ['Første linje', 'Andre linje'] }, validMc],
      }),
    );
    expect(result.errors).toEqual([]);
    expect(result.questions[0]?.lines).toEqual([
      { text: 'Hva er hovedstaden i Norge?', style: 'title' },
      { text: 'Første linje', style: 'body' },
      { text: 'Andre linje', style: 'body' },
    ]);
  });

  it('parses a valid quiz package with five fixed slots', () => {
    const result = parseAiQuizJson(
      JSON.stringify({
        questions: [
          validOpen,
          { ...validMc, type: 'multipleChoice' },
          {
            type: 'ordering',
            text: 'Sorter landene fra nord til sør',
            body: null,
            directionLabel: 'Nord øverst → Sør nederst',
            directionLabelTop: 'Nord',
            directionLabelBottom: 'Sør',
            items: ['Norge', 'Tyskland', 'Italia'],
            correctOrder: ['Norge', 'Tyskland', 'Italia'],
          },
          {
            type: 'puzzle',
            puzzleType: 'anagram',
            text: 'Løs anagrammet',
            body: null,
            answerText: 'NORDLYS',
            expressions: [],
          },
          {
            type: 'game',
            gameId: 'emojiHunt',
            text: 'Emoji-jakt',
            body: null,
          },
        ],
      }),
      'quizPackage',
    );

    expect(result.errors).toEqual([]);
    expect(result.questions.map((question) => question.type)).toEqual([
      'open',
      'mc',
      'ordering',
      'game',
      'game',
    ]);
    expect(result.questions[2]?.maxPoints).toBe(2);
    expect(result.questions[3]?.game?.gameId).toBe('anagram');
    expect(result.questions[4]?.game?.gameId).toBe('emojiHunt');
  });

  it('rejects quiz packages with missing required slots', () => {
    const result = parseAiQuizJson(
      JSON.stringify({
        questions: [validOpen, validMc, validOpen, validMc, validOpen],
      }),
      'quizPackage',
    );

    expect(result.questions).toHaveLength(0);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Oppgave 3 må være rekkefølge.',
        'Oppgave 4 må være anagram eller regnerace.',
        'Oppgave 5 må være et annet eksisterende spill.',
      ]),
    );
  });

  it('parses math race as the quiz package puzzle slot', () => {
    const result = parseAiQuizJson(
      JSON.stringify({
        questions: [
          validOpen,
          validMc,
          {
            type: 'ordering',
            text: 'Sorter fra størst til minst',
            body: null,
            directionLabel: 'Størst øverst → Minst nederst',
            directionLabelTop: 'Størst',
            directionLabelBottom: 'Minst',
            items: ['Elefant', 'Hund', 'Mus'],
            correctOrder: ['Elefant', 'Hund', 'Mus'],
          },
          {
            type: 'puzzle',
            puzzleType: 'mathRace',
            text: 'Regnerace',
            body: null,
            answerText: '',
            expressions: ['2 + 2', '3 * 4', '10 - 7'],
          },
          {
            type: 'game',
            gameId: 'rainbowPuzzle',
            text: 'Rainbow Puzzle',
            body: null,
          },
        ],
      }),
      'quizPackage',
    );

    expect(result.errors).toEqual([]);
    expect(result.questions[3]?.game?.gameId).toBe('mathExpression');
    expect(result.questions[3]?.game?.mode).toBe('race');
  });
});
