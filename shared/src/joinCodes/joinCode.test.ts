import { describe, expect, it } from 'vitest';
import {
  joinCodesMatch,
  normalizeJoinCode,
  normalizeJoinCodeForMatch,
} from './joinCode.js';

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

describe('normalizeJoinCodeForMatch', () => {
  const stored = 'STOR-NINJA';

  it.each(['STOR-NINJA', 'STOR NINJA', 'STORNINJA'])(
    'matches variant "%s" to stored code',
    (input) => {
      expect(normalizeJoinCodeForMatch(input)).toBe('STORNINJA');
      expect(joinCodesMatch(input, stored)).toBe(true);
    },
  );

  it('joinCodesMatch compares other separator variants', () => {
    expect(joinCodesMatch('GLAD TACO', 'GLAD-TACO')).toBe(true);
    expect(joinCodesMatch('GLADTACO', 'GLAD-TACO')).toBe(true);
    expect(joinCodesMatch('GLAD-TACO', 'GLAD-ELG')).toBe(false);
  });

  it('returns empty string for blank input', () => {
    expect(normalizeJoinCodeForMatch('')).toBe('');
    expect(normalizeJoinCodeForMatch(undefined)).toBe('');
  });
});
