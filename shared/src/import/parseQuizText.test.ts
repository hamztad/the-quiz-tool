import { describe, expect, it } from 'vitest';
import { parseQuizText, validateQuestionsForSave } from './parseQuizText.js';

describe('parseQuizText', () => {
  it('parses open text question with hint and answers', () => {
    const text = `Q Hva heter hovedstaden i Frankrike?
Hint: begynner med P
A Paris
A paris`;

    const { questions, errors } = parseQuizText(text);
    expect(errors).toHaveLength(0);
    expect(questions).toHaveLength(1);
    expect(questions[0].type).toBe('open');
    expect(questions[0].lines[0]).toEqual({ text: 'Hva heter hovedstaden i Frankrike?', style: 'title' });
    expect(questions[0].hint).toBe('begynner med P');
    expect(questions[0].acceptedAnswers).toEqual(['Paris', 'paris']);
  });

  it('parses multiple choice with correct marker', () => {
    const text = `MC Hvilken planet er størst?
*Jupiter
Mars
Venus
Saturn`;

    const { questions, errors } = parseQuizText(text);
    expect(errors).toHaveLength(0);
    expect(questions).toHaveLength(1);
    expect(questions[0].type).toBe('mc');
    expect(questions[0].options?.find((o) => o.isCorrect)?.text).toBe('Jupiter');
    expect(questions[0].options).toHaveLength(4);
  });

  it('continues question text on unprefixed lines', () => {
    const text = `Q Første linje
Andre linje
A svar`;

    const { questions } = parseQuizText(text);
    expect(questions[0].lines).toHaveLength(2);
    expect(questions[0].lines[1].style).toBe('body');
  });

  it('reports error for open question without answer', () => {
    const { errors } = parseQuizText('Q Uten svar?');
    expect(errors.some((e) => e.includes('godkjent svar'))).toBe(true);
  });

  it('parses multiple questions', () => {
    const text = `Q Ett?
A en
MC To?
*a
b`;

    const { questions, errors } = parseQuizText(text);
    expect(errors).toHaveLength(0);
    expect(questions).toHaveLength(2);
  });
});

describe('validateQuestionsForSave', () => {
  it('rejects empty quiz', () => {
    expect(validateQuestionsForSave([])[0]).toMatch(/minst ett spørsmål/);
  });
});
