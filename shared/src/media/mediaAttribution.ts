import type { MediaAttachment } from '../types/room.js';

export type MediaCreditsDisplayMode = 'full' | 'deferred' | 'revealed';

export const DEFERRED_MEDIA_CREDITS_MESSAGE = 'Kreditering vises etter oppgaven';

export const REVEAL_MEDIA_CREDITS_BUTTON_LABEL = 'Vis bildekreditering';

export function getMediaSourceLabel(source: MediaAttachment['source']): string {
  if (source === 'wikimedia') return 'Wikimedia Commons';
  if (source === 'upload') return 'Privat opplasting';
  if (source === 'pixabay') return 'Pixabay';
  return 'Kilde';
}

export function mediaHasAttribution(media: MediaAttachment): boolean {
  return Boolean(
    media.attributionText?.trim() ||
      media.photographer?.trim() ||
      media.creator?.trim() ||
      media.license?.trim() ||
      media.pageUrl?.trim() ||
      media.source,
  );
}

/** Alt text safe during active gameplay — never uses title/alt metadata that may spoil answers. */
export function getGameplayImageAlt(genericLabel = 'Illustrasjonsbilde'): string {
  return genericLabel;
}

export interface MediaAttributionDetails {
  attributionText: string | null;
  creator: string | null;
  license: string | null;
  sourceLabel: string;
  pageUrl: string | null;
}

export function getMediaAttributionDetails(
  media: MediaAttachment,
): MediaAttributionDetails | null {
  if (!mediaHasAttribution(media)) return null;
  return {
    attributionText: media.attributionText?.trim() || null,
    creator: media.photographer?.trim() || media.creator?.trim() || null,
    license: media.license?.trim() || null,
    sourceLabel: getMediaSourceLabel(media.source),
    pageUrl: media.pageUrl?.trim() || null,
  };
}

/** Credits for participants: hidden while question is open, expandable after lock. */
export function getParticipantMediaCreditsMode(
  status: 'open' | 'locked',
): MediaCreditsDisplayMode {
  return status === 'open' ? 'deferred' : 'revealed';
}
