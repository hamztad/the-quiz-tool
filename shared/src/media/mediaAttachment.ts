import type { MediaAttachment } from '../types/room.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isMediaAttachment(value: unknown): value is MediaAttachment {
  if (!isRecord(value)) return false;
  const validSource = value.source === undefined || value.source === 'pixabay';
  const validOptionalStrings =
    (value.alt === undefined || typeof value.alt === 'string') &&
    (value.previewUrl === undefined || typeof value.previewUrl === 'string') &&
    (value.photographer === undefined || typeof value.photographer === 'string') &&
    (value.pageUrl === undefined || typeof value.pageUrl === 'string');

  return (
    value.type === 'image' &&
    typeof value.url === 'string' &&
    value.url.length > 0 &&
    value.url.length <= 2_000 &&
    validSource &&
    validOptionalStrings
  );
}

export type ChoiceItemWithMedia = { text: string; media?: MediaAttachment };

export function choiceItemHasContent(item: ChoiceItemWithMedia): boolean {
  return Boolean(item.text.trim() || item.media?.url);
}

export function getChoiceItemLabel(item: ChoiceItemWithMedia, fallback = '—'): string {
  const text = item.text.trim();
  if (text) return text;
  const alt = item.media?.alt?.trim();
  if (alt) return alt;
  return item.media?.url ? 'Bilde' : fallback;
}
