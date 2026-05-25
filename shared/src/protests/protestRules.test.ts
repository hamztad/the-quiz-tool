import { describe, expect, it } from 'vitest';
import { hasActiveProtest } from './protestRules.js';

describe('hasActiveProtest', () => {
  it('matches pending protest for the same team and question', () => {
    expect(
      hasActiveProtest(
        [{ teamId: 'team-1', questionId: 'q-1', status: 'pending' }],
        'team-1',
        'q-1',
      ),
    ).toBe(true);
  });

  it('ignores resolved protests so a later protest can be sent', () => {
    expect(
      hasActiveProtest(
        [{ teamId: 'team-1', questionId: 'q-1', status: 'approved' }],
        'team-1',
        'q-1',
      ),
    ).toBe(false);
  });

  it('does not match another team or question', () => {
    const protests = [{ teamId: 'team-2', questionId: 'q-1', status: 'pending' as const }];

    expect(hasActiveProtest(protests, 'team-1', 'q-1')).toBe(false);
    expect(hasActiveProtest(protests, 'team-2', 'q-2')).toBe(false);
  });
});
