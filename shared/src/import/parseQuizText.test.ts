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

  it('accepts lowercase q, a and mc prefixes', () => {
    const text = `q Hva er 2+2?
a 4

mc Hvilken farge har himmelen?
*Blå
Grønn`;

    const { questions, errors } = parseQuizText(text);
    expect(errors).toHaveLength(0);
    expect(questions).toHaveLength(2);
    expect(questions[0].type).toBe('open');
    expect(questions[0].acceptedAnswers).toEqual(['4']);
    expect(questions[1].type).toBe('mc');
    expect(questions[1].options?.find((o) => o.isCorrect)?.text).toBe('Blå');
  });

  it('accepts lowercase hint prefix', () => {
    const text = `q Spørsmål?
hint: tenk hardt
a svar`;

    const { questions, errors } = parseQuizText(text);
    expect(errors).toHaveLength(0);
    expect(questions[0].hint).toBe('tenk hardt');
  });

  it('parses ordering question with direction and items', () => {
    const text = `ORDER Planetene
Retning: Nær solen → Langt unna
- Merkur
- Venus
- Jorden`;

    const { questions, errors, gamePickRequests } = parseQuizText(text);
    expect(errors).toHaveLength(0);
    expect(gamePickRequests).toHaveLength(0);
    expect(questions).toHaveLength(1);
    expect(questions[0].type).toBe('ordering');
    expect(questions[0].orderingDirectionTop).toBe('Nær solen');
    expect(questions[0].orderingDirectionBottom).toBe('Langt unna');
    expect(questions[0].orderingItems).toHaveLength(3);
    expect(questions[0].orderingCorrectOrder).toEqual(['ord-1', 'ord-2', 'ord-3']);
  });

  it('parses GAME with known label', () => {
    const text = `GAME Regnestykke`;

    const { questions, errors } = parseQuizText(text);
    expect(errors).toHaveLength(0);
    expect(questions[0].type).toBe('game');
    expect(questions[0].game?.gameId).toBe('mathExpression');
  });

  it('requests game pick when GAME has no name', () => {
    const text = `GAME
Min quiz-runde`;

    const { questions, gamePickRequests } = parseQuizText(text);
    expect(questions).toHaveLength(0);
    expect(gamePickRequests).toHaveLength(1);
    expect(gamePickRequests[0].lines[0]?.text).toBe('Min quiz-runde');
  });

  it('reports too few ordering items', () => {
    const { errors } = parseQuizText(`ORDER Kort
- En
- To`);
    expect(errors.some((e) => e.includes('3-5 elementer'))).toBe(true);
  });
});

describe('validateQuestionsForSave', () => {
  it('rejects empty quiz', () => {
    expect(validateQuestionsForSave([])[0]).toMatch(/minst ett spørsmål/);
  });
});
