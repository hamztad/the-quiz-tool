import { describe, expect, it } from 'vitest';
import { MAX_TEAM_NAME_LENGTH, validateTeamName } from './teamName.js';

describe('validateTeamName', () => {
  it('accepts Norwegian characters and names up to the limit', () => {
    expect(validateTeamName('Ekstebjørn')).toEqual({ ok: true, name: 'Ekstebjørn' });
    expect(validateTeamName('  Rød ærlig ål  ')).toEqual({ ok: true, name: 'Rød ærlig ål' });
    expect(validateTeamName('a'.repeat(30))).toEqual({ ok: true, name: 'a'.repeat(30) });
    expect(validateTeamName('a'.repeat(MAX_TEAM_NAME_LENGTH))).toEqual({
      ok: true,
      name: 'a'.repeat(MAX_TEAM_NAME_LENGTH),
    });
  });

  it('rejects empty names after trim', () => {
    expect(validateTeamName('   ')).toEqual({ ok: false, message: 'Skriv inn et lagnavn.' });
  });

  it('rejects extremely long names', () => {
    const result = validateTeamName('a'.repeat(MAX_TEAM_NAME_LENGTH + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(String(MAX_TEAM_NAME_LENGTH));
    }
  });
});
