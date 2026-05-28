import type { HostSession } from './tokens';

export type SearchImageProvider = 'pixabay' | 'wikimedia';
export type ImageProvider = SearchImageProvider | 'upload';

export interface ImageSearchResult {
  id: string;
  title: string;
  tags: string;
  previewUrl: string;
  imageUrl: string;
  pageUrl: string;
  creator?: string;
  photographer?: string;
  license?: string;
}

interface ImageSearchSuccess {
  ok: true;
  provider: ImageProvider;
  results: ImageSearchResult[];
  query?: string;
  translatedQuery?: string;
  notice?: string;
  page: number;
  hasMore: boolean;
}

interface ImageSearchError {
  ok: false;
  message: string;
}

interface UploadImageSuccess {
  ok: true;
  result: ImageSearchResult;
}

interface UploadImageError {
  ok: false;
  message: string;
}

export async function searchImageProvider(
  session: HostSession,
  provider: SearchImageProvider,
  query: string,
  language: 'nb' | 'en',
  page = 1,
): Promise<ImageSearchSuccess> {
  const params = new URLSearchParams({
    provider,
    roomId: session.roomId,
    q: query,
    language,
    page: String(page),
  });
  const res = await fetch(`/api/ai/image-search?${params.toString()}`, {
    headers: {
      'X-Host-Token': session.hostToken,
    },
  });
  const data = (await res.json()) as ImageSearchSuccess | ImageSearchError;

  if (!res.ok || !data.ok) {
    throw new Error(
      !data.ok
        ? data.message
        : provider === 'wikimedia'
          ? 'Kunne ikke søke etter Wikimedia-bilder.'
          : 'Kunne ikke søke etter Pixabay-bilder.',
    );
  }

  return data;
}

export async function searchPixabayImages(
  session: HostSession,
  query: string,
  language: 'nb' | 'en',
  page = 1,
): Promise<ImageSearchSuccess> {
  return searchImageProvider(session, 'pixabay', query, language, page);
}

export async function uploadPrivateImage(
  session: HostSession,
  file: File,
  confirmOwnership: boolean,
): Promise<ImageSearchResult> {
  const body = new FormData();
  body.set('roomId', session.roomId);
  body.set('confirmOwnership', confirmOwnership ? 'true' : 'false');
  body.set('image', file);

  const res = await fetch('/api/ai/upload-image', {
    method: 'POST',
    headers: {
      'X-Host-Token': session.hostToken,
    },
    body,
  });

  const data = (await res.json()) as UploadImageSuccess | UploadImageError;
  if (!res.ok || !data.ok) {
    throw new Error(!data.ok ? data.message : 'Kunne ikke laste opp bildet.');
  }
  return data.result;
}
