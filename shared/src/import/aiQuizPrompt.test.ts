import { describe, expect, it } from 'vitest';
import {
  AI_QUIZ_QUESTION_COUNT,
  buildAiQuizPrompt,
  buildAlternationInstructions,
  normalizeAiQuizQuestionCount,
} from './aiQuizPrompt.js';

describe('normalizeAiQuizQuestionCount', () => {
  it('defaults to 10', () => {
    expect(normalizeAiQuizQuestionCount()).toBe(AI_QUIZ_QUESTION_COUNT);
    expect(normalizeAiQuizQuestionCount(undefined)).toBe(10);
  });

  it('clamps to min and max', () => {
    expect(normalizeAiQuizQuestionCount(1)).toBe(2);
    expect(normalizeAiQuizQuestionCount(99)).toBe(10);
    expect(normalizeAiQuizQuestionCount(12.7)).toBe(10);
  });
});

describe('buildAlternationInstructions', () => {
  it('lists each type when count is small', () => {
    expect(buildAlternationInstructions(3)).toContain('Spørsmål 3: åpent tekstsvar (Q)');
    expect(buildAlternationInstructions(3)).not.toContain('Fortsett veksling');
  });

  it('summarizes quizzes with more than four questions', () => {
    const text = buildAlternationInstructions(10);
    expect(text).toContain('Fortsett veksling');
    expect(text).toContain('Spørsmål 10: flervalg (MC) (siste spørsmål, MC)');
  });
});

describe('buildAiQuizPrompt', () => {
  it('requests exactly 10 alternating questions by default', () => {
    const prompt = buildAiQuizPrompt();
    expect(prompt).toContain('Nøyaktig 10 spørsmål');
    expect(prompt).toContain('Spørsmål 1: åpent tekstsvar (Q)');
    expect(prompt).toContain('Spørsmål 2: flervalg (MC)');
    expect(prompt).toContain('Spørsmål 10: flervalg (MC) (siste spørsmål, MC)');
  });

  it('uses custom question count', () => {
    const prompt = buildAiQuizPrompt('Sport', 8);
    expect(prompt).toContain('Nøyaktig 8 spørsmål');
    expect(prompt).toContain('Tema for quizen: «Sport»');
    expect(prompt).toContain('Spørsmål 8: flervalg (MC) (siste spørsmål, MC)');
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
