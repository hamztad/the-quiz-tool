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
  code?: string;
}

interface UploadImageSuccess {
  ok: true;
  result: ImageSearchResult;
}

interface UploadImageError {
  ok: false;
  message: string;
}

function imageSearchFallbackMessage(
  provider: SearchImageProvider,
  status: number,
): string {
  if (status === 404) {
    return 'Quizen finnes ikke på serveren. Last siden på nytt eller opprett quizen på nytt.';
  }
  if (status === 403) {
    return 'Ugyldig quizmaster-tilgang. Last siden på nytt for å koble til quizen igjen.';
  }
  if (status === 503) {
    return 'Pixabay-søk er ikke konfigurert på serveren (PIXABAY_API_KEY mangler).';
  }
  if (status === 502 || status === 504) {
    return 'Kunne ikke nå serveren. Sjekk at backend kjører (npm run dev).';
  }
  return provider === 'wikimedia'
    ? 'Kunne ikke søke etter Wikimedia-bilder.'
    : 'Kunne ikke søke etter Pixabay-bilder.';
}

async function parseImageSearchResponse(
  res: Response,
  provider: SearchImageProvider,
): Promise<ImageSearchSuccess | ImageSearchError> {
  const raw = await res.text();
  if (!raw.trim()) {
    return {
      ok: false,
      message: imageSearchFallbackMessage(provider, res.status),
    };
  }

  try {
    return JSON.parse(raw) as ImageSearchSuccess | ImageSearchError;
  } catch {
    return {
      ok: false,
      message: imageSearchFallbackMessage(provider, res.status),
    };
  }
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
  const data = await parseImageSearchResponse(res, provider);

  if (!res.ok || !data.ok) {
    throw new Error(
      !data.ok ? data.message : imageSearchFallbackMessage(provider, res.status),
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

  const raw = await res.text();
  let data: UploadImageSuccess | UploadImageError;
  try {
    data = JSON.parse(raw) as UploadImageSuccess | UploadImageError;
  } catch {
    throw new Error('Kunne ikke laste opp bildet. Sjekk at serveren kjører.');
  }

  if (!res.ok || !data.ok) {
    throw new Error(!data.ok ? data.message : 'Kunne ikke laste opp bildet.');
  }
  return data.result;
}
