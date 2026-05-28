import type { ProviderSearchResult } from './types.js';

const WIKIMEDIA_USER_AGENT = 'TheQuizTool/1.0 (quiz image search; contact: quiz@example.com)';

interface WikimediaImageInfo {
  url?: string;
  thumburl?: string;
  width?: number;
  height?: number;
  mime?: string;
  extmetadata?: Record<string, { value?: string }>;
}

interface WikimediaPage {
  pageid?: number;
  title?: string;
  fullurl?: string;
  imageinfo?: WikimediaImageInfo[];
}

interface WikimediaResponse {
  query?: {
    pages?: Record<string, WikimediaPage>;
  };
  error?: {
    code?: string;
    info?: string;
  };
}

function stripHtml(value: string | undefined): string {
  if (!value) return '';
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMeta(
  metadata: Record<string, { value?: string }> | undefined,
  key: string,
): string {
  return stripHtml(metadata?.[key]?.value);
}

function cleanTitle(rawTitle: string | undefined): string {
  if (!rawTitle) return '';
  return rawTitle.replace(/^File:/i, '').replace(/_/g, ' ').trim();
}

export async function searchWikimediaImages(
  query: string,
  page = 1,
): Promise<{ results: ProviderSearchResult[]; hasMore: boolean }> {
  const offset = (page - 1) * 12;
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '12',
    gsroffset: String(offset),
    prop: 'imageinfo|info',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '640',
    inprop: 'url',
  });

  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
    headers: {
      'User-Agent': WIKIMEDIA_USER_AGENT,
      Accept: 'application/json',
    },
  });

  const bodyText = await res.text();
  let data: WikimediaResponse;
  try {
    data = JSON.parse(bodyText) as WikimediaResponse;
  } catch {
    throw new Error(
      res.ok
        ? 'Wikimedia returnerte ugyldig svar.'
        : `Wikimedia-feil (${res.status}). Prøv igjen senere.`,
    );
  }

  if (data.error) {
    throw new Error(data.error.info ?? 'Wikimedia-søk feilet.');
  }

  if (!res.ok) {
    throw new Error(`Wikimedia-feil (${res.status}). Prøv igjen senere.`);
  }

  const pages = Object.values(data.query?.pages ?? {});
  const results: ProviderSearchResult[] = [];

  for (const pageEntry of pages) {
    const info = pageEntry.imageinfo?.[0];
    if (!info?.url) continue;
    if (!info.mime?.startsWith('image/')) continue;
    if (info.mime === 'image/svg+xml') continue;
    if ((info.width ?? 0) < 400 || (info.height ?? 0) < 300) continue;

    const metadata = info.extmetadata;
    const titleMeta = firstMeta(metadata, 'ObjectName');
    const creator =
      firstMeta(metadata, 'Artist') ||
      firstMeta(metadata, 'Credit') ||
      firstMeta(metadata, 'AttributionRequired');
    const license = firstMeta(metadata, 'LicenseShortName') || firstMeta(metadata, 'UsageTerms');
    const title = titleMeta || cleanTitle(pageEntry.title) || 'Wikimedia Commons image';

    results.push({
      id: String(pageEntry.pageid ?? pageEntry.title ?? info.url),
      title,
      tags: title,
      previewUrl: info.thumburl ?? info.url,
      imageUrl: info.url,
      pageUrl: pageEntry.fullurl ?? info.url,
      creator,
      photographer: creator,
      license,
    });
  }

  return { results, hasMore: pages.length >= 12 };
}
