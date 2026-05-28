import type { ProviderSearchResult } from './types.js';

interface PixabayHit {
  id: number;
  tags?: string;
  previewURL?: string;
  webformatURL?: string;
  largeImageURL?: string;
  pageURL?: string;
  user?: string;
}

interface PixabayResponse {
  hits?: PixabayHit[];
  totalHits?: number;
}

export async function searchPixabayImages(
  apiKey: string,
  query: string,
  page = 1,
): Promise<{ results: ProviderSearchResult[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    image_type: 'photo',
    safesearch: 'true',
    per_page: '12',
    page: String(page),
  });

  const pixabayRes = await fetch(`https://pixabay.com/api/?${params.toString()}`);
  if (!pixabayRes.ok) {
    throw new Error(`Pixabay-feil: ${pixabayRes.status}`);
  }

  const data = (await pixabayRes.json()) as PixabayResponse;
  const results = (data.hits ?? [])
    .filter((hit) => hit.webformatURL || hit.largeImageURL)
    .map((hit) => ({
      id: String(hit.id),
      title: hit.tags ?? 'Pixabay image',
      tags: hit.tags ?? '',
      previewUrl: hit.previewURL ?? hit.webformatURL ?? hit.largeImageURL ?? '',
      imageUrl: hit.webformatURL ?? hit.largeImageURL ?? '',
      pageUrl: hit.pageURL ?? '',
      creator: hit.user ?? '',
      photographer: hit.user ?? '',
    }));

  return { results, hasMore: page * 12 < (data.totalHits ?? 0) };
}
