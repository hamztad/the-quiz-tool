import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchPixabayImages } from './pixabay.js';

describe('searchPixabayImages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps invalid API key response to a clear error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        text: async () => '[ERROR 400] Invalid or missing API key (https://pixabay.com/api/docs/).',
      })),
    );

    await expect(searchPixabayImages('bad-key', 'norway', 1)).rejects.toThrow(
      /Pixabay API-nøkkelen/i,
    );
  });

  it('returns hits when Pixabay responds with JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            totalHits: 1,
            hits: [
              {
                id: 42,
                tags: 'norway',
                previewURL: 'https://example.com/p.jpg',
                webformatURL: 'https://example.com/w.jpg',
                pageURL: 'https://pixabay.com/photos/42',
                user: 'tester',
              },
            ],
          }),
      })),
    );

    const result = await searchPixabayImages('good-key', 'norway', 1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.imageUrl).toBe('https://example.com/w.jpg');
  });
});
