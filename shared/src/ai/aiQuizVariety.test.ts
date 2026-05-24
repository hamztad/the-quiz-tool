import { describe, expect, it } from 'vitest';
import {
  buildAiQuizVarietyHints,
  createSeededRandom,
  formatVarietyBlock,
} from './aiQuizVariety.js';

describe('buildAiQuizVarietyHints', () => {
  it('picks theme-specific angles for Geografi', () => {
    const random = createSeededRandom('geo-test');
    const hints = buildAiQuizVarietyHints('Geografi', 6, 'seed-1', random);
    expect(hints.focusAngles.length).toBeGreaterThanOrEqual(2);
    expect(hints.avoidPhrases.some((p) => p.toLowerCase().includes('frankrike'))).toBe(true);
  });

  it('uses generic angles for custom topics', () => {
    const random = createSeededRandom('custom');
    const hints = buildAiQuizVarietyHints('Oslo på 1800-tallet', 5, 's2', random);
    expect(hints.angleInstruction).toContain('Oslo på 1800-tallet');
    expect(hints.focusAngles.length).toBeGreaterThan(0);
  });

  it('formatVarietyBlock includes session id and focus', () => {
    const hints = buildAiQuizVarietyHints('Sport', 4, 'fixed-id', createSeededRandom('x'));
    const block = formatVarietyBlock(hints);
    expect(block).toContain('fixed-id');
    expect(block).toContain('VARIASJON');
    expect(block).toContain('vinklene');
  });
});
