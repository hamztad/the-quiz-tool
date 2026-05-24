import { describe, expect, it } from 'vitest';
import { AI_QUIZ_QUESTION_COUNT, buildAiQuizPrompt } from './aiQuizPrompt.js';

describe('buildAiQuizPrompt', () => {
  it('requests exactly 10 alternating questions', () => {
    const prompt = buildAiQuizPrompt();
    expect(prompt).toContain(`Nøyaktig ${AI_QUIZ_QUESTION_COUNT} spørsmål`);
    expect(prompt).toContain('Spørsmål 1: åpent tekstsvar (Q)');
    expect(prompt).toContain('Spørsmål 2: flervalg (MC)');
    expect(prompt).toContain(`spørsmål ${AI_QUIZ_QUESTION_COUNT} (som må være MC)`);
  });

  it('requires Norwegian language for all quiz content', () => {
    const prompt = buildAiQuizPrompt();
    expect(prompt).toContain('på norsk');
    expect(prompt).toContain('naturlig, idiomatisk norsk');
    expect(prompt).toContain('Unngå engelske ord');
    expect(prompt).toContain('norsk pubquiz');
  });

  it('includes import format rules and Norwegian example', () => {
    const prompt = buildAiQuizPrompt();
    expect(prompt).toContain('Q Hva heter hovedstaden i Frankrike?');
    expect(prompt).toContain('MC Hvilken planet er størst?');
    expect(prompt).toContain('*Jupiter');
    expect(prompt).toContain('Ingen markdown, ingen kodeblokker');
  });

  it('embeds optional topic when provided', () => {
    const prompt = buildAiQuizPrompt('Norsk geografi');
    expect(prompt).toContain('Tema for quizen: «Norsk geografi»');
  });
});
