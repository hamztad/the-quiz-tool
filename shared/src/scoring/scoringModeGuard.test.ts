import { describe, expect, it } from 'vitest';
import { canChangeScoringMode } from './scoringModeGuard.js';

describe('canChangeScoringMode', () => {
  it('allows change in lobby without scores', () => {
    expect(canChangeScoringMode({ phase: 'lobby', scores: [] })).toEqual({ ok: true });
  });

  it('blocks after scores exist', () => {
    const result = canChangeScoringMode({
      phase: 'lobby',
      scores: [{ teamId: 't1', questionId: 'q1', points: 1, source: 'auto' }],
    });
    expect(result.ok).toBe(false);
  });
});
