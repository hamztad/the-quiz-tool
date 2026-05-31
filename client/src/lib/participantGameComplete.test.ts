import { describe, expect, it } from 'vitest';

/** Speiler synlighetsregelen i useParticipantGameCompleteNav. */
function isGameCompleteNavVisible(
  enabled: boolean,
  submissionCount: number,
  baselineCount: number,
  retryDismissed: boolean,
): boolean {
  return enabled && submissionCount > baselineCount && !retryDismissed;
}

describe('game complete nav visibility', () => {
  it('is hidden when entering question with existing attempts', () => {
    expect(isGameCompleteNavVisible(true, 2, 2, false)).toBe(false);
  });

  it('shows after new attempt since entry', () => {
    expect(isGameCompleteNavVisible(true, 3, 2, false)).toBe(true);
  });

  it('stays hidden after retry dismiss until next attempt', () => {
    expect(isGameCompleteNavVisible(true, 3, 3, true)).toBe(false);
    expect(isGameCompleteNavVisible(true, 4, 3, false)).toBe(true);
  });
});
