import { describe, expect, it } from 'vitest';
import { resolveGameImportToken } from './resolveGameImport.js';

describe('resolveGameImportToken', () => {
  it('resolves by label and id', () => {
    expect(resolveGameImportToken('Regnerace')?.gameId).toBe('mathExpression');
    expect(resolveGameImportToken('Regnestykke')?.gameId).toBe('mathExpression');
    expect(resolveGameImportToken('mathExpression')?.gameId).toBe('mathExpression');
  });

  it('defaults Regnerace import to race mode', () => {
    const resolved = resolveGameImportToken('Regnerace');
    expect(resolved?.config.mode).toBe('race');
    if (resolved?.config.mode === 'race') {
      expect(resolved.config.enabledOperations?.length).toBeGreaterThan(0);
    }
  });

  it('returns null for empty or placeholder', () => {
    expect(resolveGameImportToken('')).toBeNull();
    expect(resolveGameImportToken('?')).toBeNull();
  });
});
