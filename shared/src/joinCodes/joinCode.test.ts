import { describe, expect, it } from 'vitest';
import { normalizeJoinCode } from './joinCode.js';

describe('normalizeJoinCode', () => {
  it('uppercases and hyphenates spaced input', () => {
    expect(normalizeJoinCode('glad taco')).toBe('GLAD-TACO');
  });

  it('preserves existing hyphen format', () => {
    expect(normalizeJoinCode('rød-elg')).toBe('RØD-ELG');
  });

  it('decodes URL-encoded Norwegian characters', () => {
    expect(normalizeJoinCode(encodeURIComponent('RØD-ELG'))).toBe('RØD-ELG');
  });

  it('collapses underscores and multiple hyphens', () => {
    expect(normalizeJoinCode('super__banan')).toBe('SUPER-BANAN');
    expect(normalizeJoinCode('GLAD--TACO')).toBe('GLAD-TACO');
  });
});
