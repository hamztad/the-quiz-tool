import { describe, expect, it } from 'vitest';
import { resolveGameImportToken } from './resolveGameImport.js';

describe('resolveGameImportToken', () => {
  it('resolves by label and id', () => {
    expect(resolveGameImportToken('Regnestykke')?.gameId).toBe('mathExpression');
    expect(resolveGameImportToken('mathExpression')?.gameId).toBe('mathExpression');
  });

  it('returns null for empty or placeholder', () => {
    expect(resolveGameImportToken('')).toBeNull();
    expect(resolveGameImportToken('?')).toBeNull();
  });
});
