import { describe, expect, it } from 'vitest';
import { AI_QUIZ_QUESTION_COUNT, buildAiQuizPrompt } from './aiQuizPrompt.js';

describe('buildAiQuizPrompt', () => {
  it('requests exactly 10 alternating questions', () => {
    const prompt = buildAiQuizPrompt();
    expect(prompt).toContain(`Exactly ${AI_QUIZ_QUESTION_COUNT} questions`);
    expect(prompt).toContain('Question 1: open text (Q)');
    expect(prompt).toContain('Question 2: multiple choice (MC)');
    expect(prompt).toContain(`question ${AI_QUIZ_QUESTION_COUNT} (which must be MC)`);
  });

  it('includes import format rules and example', () => {
    const prompt = buildAiQuizPrompt();
    expect(prompt).toContain('Q Hva heter hovedstaden i Frankrike?');
    expect(prompt).toContain('MC Hvilken planet er størst?');
    expect(prompt).toContain('*Jupiter');
    expect(prompt).toContain('No markdown, no code fences');
  });

  it('embeds optional topic when provided', () => {
    const prompt = buildAiQuizPrompt('Norsk geografi');
    expect(prompt).toContain('Topic/theme for the quiz: "Norsk geografi"');
  });
});
