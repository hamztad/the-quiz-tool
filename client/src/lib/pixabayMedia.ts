import type { MediaAttachment } from '@quiz-tool/shared';
import type { PixabayImageResult } from './pixabayApi';

export function pixabayResultToMedia(result: PixabayImageResult): MediaAttachment {
  return {
    type: 'image',
    url: result.imageUrl,
    previewUrl: result.previewUrl,
    alt: result.tags,
    source: 'pixabay',
    photographer: result.photographer,
    pageUrl: result.pageUrl,
  };
}
