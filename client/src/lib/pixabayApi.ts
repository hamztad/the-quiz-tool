import type { HostSession } from './tokens';

export interface PixabayImageResult {
  id: string;
  tags: string;
  previewUrl: string;
  imageUrl: string;
  pageUrl: string;
  photographer: string;
}

interface PixabaySearchSuccess {
  ok: true;
  results: PixabayImageResult[];
  query?: string;
  translatedQuery?: string;
  notice?: string;
}

interface PixabaySearchError {
  ok: false;
  message: string;
}

export async function searchPixabayImages(
  session: HostSession,
  query: string,
  language: 'nb' | 'en',
): Promise<PixabaySearchSuccess> {
  const params = new URLSearchParams({ roomId: session.roomId, q: query, language });
  const res = await fetch(`/api/ai/pixabay-search?${params.toString()}`, {
    headers: {
      'X-Host-Token': session.hostToken,
    },
  });
  const data = (await res.json()) as PixabaySearchSuccess | PixabaySearchError;

  if (!res.ok || !data.ok) {
    throw new Error(!data.ok ? data.message : 'Kunne ikke søke etter bilder.');
  }

  return data;
}
