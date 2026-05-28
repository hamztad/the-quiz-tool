import type { MediaAttachment } from '@quiz-tool/shared';
import type { ImageProvider, ImageSearchResult } from './pixabayApi';

export function imageResultToMedia(
  result: ImageSearchResult,
  source: ImageProvider,
): MediaAttachment {
  return {
    type: 'image',
    url: result.imageUrl,
    previewUrl: result.previewUrl,
    alt: result.tags || result.title,
    source,
    title: result.title,
    creator: result.creator,
    photographer: result.photographer ?? result.creator,
    license: result.license,
    pageUrl: result.pageUrl,
  };
}

export function pixabayResultToMedia(result: ImageSearchResult): MediaAttachment {
  return imageResultToMedia(result, 'pixabay');
}
