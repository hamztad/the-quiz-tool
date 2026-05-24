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
});
