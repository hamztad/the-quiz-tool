import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { roomStore } from '../../store/activeRoomStore.js';

const MAX_UPLOAD_BYTES = 1_000_000;
const MAX_IMAGE_SIDE = 1920;
const GAMEPLAY_SIDE = 1200;
const THUMB_SIDE = 480;
const UPLOAD_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const uploadRoot = path.resolve(process.cwd(), 'data', 'uploads');
const imageRoot = path.join(uploadRoot, 'images');
const gameplayRoot = path.join(uploadRoot, 'gameplay');
const thumbRoot = path.join(uploadRoot, 'thumbs');
const metadataRoot = path.join(uploadRoot, 'meta');

let cleanupTimer: NodeJS.Timeout | null = null;

export interface UploadedImageMetadata {
  imageId: string;
  roomId: string;
  uploadedAt: number;
  expiresAt: number;
  ipHash: string;
  filename: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  imagePath: string;
  gameplayPath: string;
  thumbPath: string;
  imageUrlPath: string;
  gameplayUrlPath: string;
  thumbUrlPath: string;
}

function extForMime(mimeType: string): '.jpg' | '.png' | '.webp' {
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.-]+/g, '_').slice(0, 120) || 'upload';
}

function ipToHash(ip: string | undefined): string {
  const salt = process.env.UPLOAD_IP_HASH_SALT?.trim() || 'quiz-upload-salt';
  return createHash('sha256')
    .update(`${salt}:${ip || 'unknown'}`)
    .digest('hex')
    .slice(0, 32);
}

async function ensureFolders() {
  await Promise.all([
    fs.mkdir(imageRoot, { recursive: true }),
    fs.mkdir(gameplayRoot, { recursive: true }),
    fs.mkdir(thumbRoot, { recursive: true }),
    fs.mkdir(metadataRoot, { recursive: true }),
  ]);
}

async function writeMetadataFile(metadata: UploadedImageMetadata) {
  const file = path.join(metadataRoot, `${metadata.imageId}.json`);
  await fs.writeFile(file, JSON.stringify(metadata), 'utf8');
}

export function initUploadCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    void cleanupUploadedImages();
  }, CLEANUP_INTERVAL_MS);
}

async function removeUploadByMeta(meta: UploadedImageMetadata) {
  await Promise.allSettled([
    fs.rm(meta.imagePath, { force: true }),
    fs.rm(meta.gameplayPath, { force: true }),
    fs.rm(meta.thumbPath, { force: true }),
    fs.rm(path.join(metadataRoot, `${meta.imageId}.json`), { force: true }),
  ]);
}

export async function cleanupUploadedImages() {
  await ensureFolders();
  const files = await fs.readdir(metadataRoot);
  const now = Date.now();

  await Promise.all(
    files
      .filter((name) => name.endsWith('.json'))
      .map(async (name) => {
        try {
          const raw = await fs.readFile(path.join(metadataRoot, name), 'utf8');
          const meta = JSON.parse(raw) as UploadedImageMetadata;
          const room = roomStore.get(meta.roomId);
          const shouldDelete =
            meta.expiresAt <= now || !room || room.expiresAt <= now || room.phase === 'ended';
          if (shouldDelete) {
            await removeUploadByMeta(meta);
          }
        } catch {
          await fs.rm(path.join(metadataRoot, name), { force: true });
        }
      }),
  );
}

export async function storeUploadedImage(params: {
  roomId: string;
  hostToken: string;
  fileBuffer: Buffer;
  mimeType: string;
  originalFilename: string;
  confirmOwnership: boolean;
  requestIp?: string;
}): Promise<UploadedImageMetadata> {
  const {
    roomId,
    hostToken,
    fileBuffer,
    mimeType,
    originalFilename,
    confirmOwnership,
    requestIp,
  } = params;

  if (!confirmOwnership) {
    throw new Error('Du må bekrefte at du eier bildet eller har tillatelse til bruk.');
  }

  const room = roomStore.get(roomId);
  if (!room || room.hostToken !== hostToken) {
    throw new Error('Ugyldig Gruizmaster-tilgang.');
  }

  const ext = path.extname(originalFilename).toLowerCase();
  if (!allowedExt.has(ext) || !allowedMime.has(mimeType)) {
    throw new Error('Kun JPG, JPEG, PNG og WEBP er tillatt.');
  }

  if (fileBuffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('Image must be smaller than 1 MB.');
  }

  await ensureFolders();
  await cleanupUploadedImages();

  let normalizedMime: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg';
  if (mimeType === 'image/png') normalizedMime = 'image/png';
  if (mimeType === 'image/webp') normalizedMime = 'image/webp';

  let normalizedBuffer: Buffer;
  let gameplayBuffer: Buffer;
  let thumbBuffer: Buffer;
  try {
    const base = sharp(fileBuffer, { failOn: 'error' }).rotate();
    const fullPipeline = base.clone().resize({
      width: MAX_IMAGE_SIDE,
      height: MAX_IMAGE_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    });
    const gameplayPipeline = base.clone().resize({
      width: GAMEPLAY_SIDE,
      height: GAMEPLAY_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    });
    if (normalizedMime === 'image/png') {
      normalizedBuffer = await fullPipeline.png({ compressionLevel: 9 }).toBuffer();
      gameplayBuffer = await gameplayPipeline.png({ compressionLevel: 9 }).toBuffer();
      thumbBuffer = await sharp(normalizedBuffer)
        .resize({ width: THUMB_SIDE, height: THUMB_SIDE, fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer();
    } else if (normalizedMime === 'image/webp') {
      normalizedBuffer = await fullPipeline.webp({ quality: 82 }).toBuffer();
      gameplayBuffer = await gameplayPipeline.webp({ quality: 80 }).toBuffer();
      thumbBuffer = await sharp(normalizedBuffer)
        .resize({ width: THUMB_SIDE, height: THUMB_SIDE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
    } else {
      normalizedMime = 'image/jpeg';
      normalizedBuffer = await fullPipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer();
      gameplayBuffer = await gameplayPipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      thumbBuffer = await sharp(normalizedBuffer)
        .resize({ width: THUMB_SIDE, height: THUMB_SIDE, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer();
    }
  } catch {
    throw new Error('Bildet kunne ikke behandles. Sjekk at filen er gyldig.');
  }

  if (normalizedBuffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('Image must be smaller than 1 MB.');
  }

  const imageId = randomUUID();
  const uploadedAt = Date.now();
  const expiresAt = Math.min(room.expiresAt, uploadedAt + UPLOAD_MAX_AGE_MS);
  const extension = extForMime(normalizedMime);
  const safeName = sanitizeFilename(originalFilename);
  const imagePath = path.join(imageRoot, `${imageId}${extension}`);
  const gameplayPath = path.join(gameplayRoot, `${imageId}${extension}`);
  const thumbPath = path.join(thumbRoot, `${imageId}${extension}`);

  await Promise.all([
    fs.writeFile(imagePath, normalizedBuffer),
    fs.writeFile(gameplayPath, gameplayBuffer),
    fs.writeFile(thumbPath, thumbBuffer),
  ]);

  const metadata: UploadedImageMetadata = {
    imageId,
    roomId,
    uploadedAt,
    expiresAt,
    ipHash: ipToHash(requestIp),
    filename: safeName,
    mimeType: normalizedMime,
    imagePath,
    gameplayPath,
    thumbPath,
    imageUrlPath: `/api/ai/uploaded-images/${imageId}`,
    gameplayUrlPath: `/api/game-images/${imageId}`,
    thumbUrlPath: `/api/ai/uploaded-images/${imageId}?thumb=1`,
  };
  await writeMetadataFile(metadata);
  return metadata;
}

export async function getUploadedImageMetadata(imageId: string): Promise<UploadedImageMetadata | null> {
  try {
    const raw = await fs.readFile(path.join(metadataRoot, `${imageId}.json`), 'utf8');
    const meta = JSON.parse(raw) as UploadedImageMetadata;
    const room = roomStore.get(meta.roomId);
    if (!room || room.expiresAt <= Date.now() || meta.expiresAt <= Date.now() || room.phase === 'ended') {
      await removeUploadByMeta(meta);
      return null;
    }
    return meta;
  } catch {
    return null;
  }
}
