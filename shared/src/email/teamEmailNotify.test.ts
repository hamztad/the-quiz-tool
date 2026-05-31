import { describe, expect, it } from 'vitest';
import { normalizeTeamEmail, validateTeamEmail } from './teamEmailNotify.js';

describe('validateTeamEmail', () => {
  it('accepts valid email', () => {
    expect(validateTeamEmail('Ola@Example.com')).toEqual({
      ok: true,
      email: 'ola@example.com',
    });
  });

  it('rejects empty', () => {
    expect(validateTeamEmail('  ').ok).toBe(false);
  });

  it('rejects invalid format', () => {
    expect(validateTeamEmail('not-an-email').ok).toBe(false);
  });
});

describe('normalizeTeamEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeTeamEmail('  Test@Mail.NO ')).toBe('test@mail.no');
  });
});
