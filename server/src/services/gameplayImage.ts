import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import type { MediaAttachment, Question } from '@quiz-tool/shared';
import { getUploadedImageMetadata } from './imageProviders/upload.js';

const GAMEPLAY_MAX_SIDE = 1200;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 64;

interface CachedImage {
  buffer: Buffer;
  mimeType: string;
  expiresAt: number;
}

const remoteCache = new Map<string, CachedImage>();

function cacheKey(roomId: string, questionId: string): string {
  return `${roomId}:${questionId}`;
}

function trimCache() {
  const now = Date.now();
  for (const [key, value] of remoteCache) {
    if (value.expiresAt <= now) remoteCache.delete(key);
  }
  if (remoteCache.size <= CACHE_MAX_ENTRIES) return;
  const sorted = [...remoteCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  for (const [key] of sorted.slice(0, remoteCache.size - CACHE_MAX_ENTRIES)) {
    remoteCache.delete(key);
  }
}

function extractUploadImageId(url: string): string | null {
  const match = url.match(/\/(?:api\/(?:ai\/)?)?(?:uploaded-images|game-images)\/([0-9a-f-]{36})/i);
  return match?.[1] ?? null;
}

async function resizeBuffer(buffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const pipeline = sharp(buffer, { failOn: 'error' }).rotate().resize({
    width: GAMEPLAY_MAX_SIDE,
    height: GAMEPLAY_MAX_SIDE,
    fit: 'inside',
    withoutEnlargement: true,
  });
  if (mimeType === 'image/png') {
    return { buffer: await pipeline.png({ compressionLevel: 9 }).toBuffer(), mimeType: 'image/png' };
  }
  if (mimeType === 'image/webp') {
    return { buffer: await pipeline.webp({ quality: 82 }).toBuffer(), mimeType: 'image/webp' };
  }
  return {
    buffer: await pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer(),
    mimeType: 'image/jpeg',
  };
}

async function readUploadGameplayBuffer(imageId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const meta = await getUploadedImageMetadata(imageId);
  if (!meta) return null;
  const gameplayPath = meta.gameplayPath ?? meta.imagePath;
  try {
    const buffer = await fs.readFile(gameplayPath);
    return { buffer, mimeType: meta.mimeType };
  } catch {
    return null;
  }
}

async function fetchRemoteImage(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'TheQuizTool/1.0 (gameplay-image)' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error('Kunne ikke hente bildet.');
  }
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
  const mimeType =
    contentType === 'image/png' || contentType === 'image/webp' ? contentType : 'image/jpeg';
  return resizeBuffer(Buffer.from(arrayBuffer), mimeType);
}

function imageMedia(question: Question): MediaAttachment | undefined {
  return question.media?.find((item) => item.type === 'image' && item.url.trim().length > 0);
}

export async function resolveGameplayImage(
  roomId: string,
  question: Question,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const media = imageMedia(question);
  if (!media) {
    throw new Error('Spillbildet mangler.');
  }

  const uploadId = extractUploadImageId(media.url);
  if (uploadId) {
    const uploaded = await readUploadGameplayBuffer(uploadId);
    if (uploaded) return uploaded;
  }

  const key = cacheKey(roomId, question.id);
  const cached = remoteCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { buffer: cached.buffer, mimeType: cached.mimeType };
  }

  const remote = await fetchRemoteImage(media.url);
  trimCache();
  remoteCache.set(key, {
    ...remote,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return remote;
}

export function invalidateGameplayImageCache(roomId: string, questionId: string) {
  remoteCache.delete(cacheKey(roomId, questionId));
}
