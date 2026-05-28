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
  error?: string;
}

function parsePixabayBody(text: string): PixabayResponse | null {
  try {
    return JSON.parse(text) as PixabayResponse;
  } catch {
    return null;
  }
}

function pixabayErrorMessage(status: number, bodyText: string): string {
  const parsed = parsePixabayBody(bodyText);
  if (parsed?.error) {
    return `Pixabay: ${parsed.error}`;
  }
  const trimmed = bodyText.trim();
  if (trimmed.startsWith('[ERROR')) {
    if (/invalid|missing api key/i.test(trimmed)) {
      return 'Pixabay API-nøkkelen er ugyldig eller mangler. Sjekk PIXABAY_API_KEY på serveren.';
    }
    return trimmed.replace(/^\[ERROR \d+\]\s*/, 'Pixabay: ');
  }
  if (status === 401 || status === 403 || status === 400) {
    return 'Pixabay API-nøkkelen er ugyldig eller mangler. Sjekk PIXABAY_API_KEY på serveren.';
  }
  return `Pixabay-feil (${status}). Prøv igjen senere.`;
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
  const bodyText = await pixabayRes.text();
  const data = parsePixabayBody(bodyText);

  if (!data) {
    throw new Error(pixabayErrorMessage(pixabayRes.status, bodyText));
  }

  if (!pixabayRes.ok || data.error) {
    throw new Error(pixabayErrorMessage(pixabayRes.status, data.error ?? bodyText));
  }

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
