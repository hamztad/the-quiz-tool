import { describe, expect, it } from 'vitest';
import { canonicalTeamName, MAX_TEAM_NAME_LENGTH, validateTeamName } from './teamName.js';

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
    expect(validateTeamName('   ')).toEqual({ ok: false, message: 'Skriv inn et spillernavn.' });
  });

  it('reserves Testspiller for test mode', () => {
    expect(validateTeamName('Testspiller')).toEqual({
      ok: false,
      message: 'Dette navnet er reservert for testmodus. Velg et annet spillernavn.',
    });
    expect(validateTeamName('Testspiller', { allowReservedTestName: true })).toEqual({
      ok: true,
      name: 'Testspiller',
    });
  });

  it('rejects extremely long names', () => {
    const result = validateTeamName('a'.repeat(MAX_TEAM_NAME_LENGTH + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(String(MAX_TEAM_NAME_LENGTH));
    }
  });

  it('builds a canonical form for duplicate checks', () => {
    expect(canonicalTeamName('  Team   One  ')).toBe('team one');
    expect(canonicalTeamName('Ørn')).toBe('ørn');
  });
});
