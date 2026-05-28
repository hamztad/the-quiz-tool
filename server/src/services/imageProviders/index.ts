import { searchPixabayImages } from './pixabay.js';
import { cleanupUploadedImages, getUploadedImageMetadata, initUploadCleanup, storeUploadedImage } from './upload.js';
import { searchWikimediaImages } from './wikimedia.js';
import type { ImageProviderId, ProviderSearchResult } from './types.js';

export type { ImageProviderId, ProviderSearchResult } from './types.js';
export { providerResultToMedia } from './types.js';
export { cleanupUploadedImages, getUploadedImageMetadata, initUploadCleanup, storeUploadedImage };

export async function searchImagesByProvider(
  provider: ImageProviderId,
  query: string,
  page: number,
  pixabayApiKey?: string,
): Promise<{ results: ProviderSearchResult[]; hasMore: boolean }> {
  if (provider === 'pixabay') {
    if (!pixabayApiKey) {
      throw new Error('Pixabay-søk er ikke konfigurert på serveren (PIXABAY_API_KEY mangler).');
    }
    return searchPixabayImages(pixabayApiKey, query, page);
  }
  if (provider === 'upload') {
    throw new Error('Upload provider støtter ikke søk.');
  }
  return searchWikimediaImages(query, page);
}
