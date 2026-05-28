import type { MediaAttachment } from '@quiz-tool/shared';

export type ImageProviderId = 'pixabay' | 'wikimedia';

export interface ProviderSearchResult {
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

export function providerResultToMedia(
  provider: ImageProviderId,
  result: ProviderSearchResult,
): MediaAttachment {
  return {
    type: 'image',
    url: result.imageUrl,
    previewUrl: result.previewUrl,
    alt: result.tags || result.title,
    source: provider,
    title: result.title,
    creator: result.creator,
    photographer: result.photographer ?? result.creator,
    license: result.license,
    pageUrl: result.pageUrl,
  };
}
