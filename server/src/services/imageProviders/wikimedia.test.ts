import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchWikimediaImages } from './wikimedia.js';

describe('searchWikimediaImages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces Wikimedia API error payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            error: { code: 'too-many-requests', info: 'Rate limit exceeded' },
          }),
      })),
    );

    await expect(searchWikimediaImages('test', 1)).rejects.toThrow(/Rate limit exceeded/i);
  });
});
