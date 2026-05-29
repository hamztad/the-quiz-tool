import { existsSync, readFileSync } from 'fs';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';
import type { RoomRecord } from './roomStoreTypes.js';

const SNAPSHOT_VERSION = 1 as const;
const SNAPSHOT_FILENAME = 'rooms.snapshot.json';

export interface RoomSnapshotFile {
  version: typeof SNAPSHOT_VERSION;
  savedAt: number;
  rooms: RoomRecord[];
}

export function getDefaultRoomDataDir(): string {
  return process.env.QUIZ_ROOM_DATA_DIR ?? path.join(process.cwd(), 'data', 'rooms');
}

export function getSnapshotPath(dataDir = getDefaultRoomDataDir()): string {
  return path.join(dataDir, SNAPSHOT_FILENAME);
}

function isRoomRecord(value: unknown): value is RoomRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as RoomRecord;
  return (
    typeof record.id === 'string' &&
    typeof record.joinCode === 'string' &&
    typeof record.hostToken === 'string' &&
    typeof record.expiresAt === 'number' &&
    typeof record.createdAt === 'number' &&
    Array.isArray(record.questions)
  );
}

export async function loadRoomsFromDisk(
  dataDir = getDefaultRoomDataDir(),
  now = Date.now(),
): Promise<RoomRecord[]> {
  const filePath = getSnapshotPath(dataDir);
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as RoomSnapshotFile;
    if (parsed.version !== SNAPSHOT_VERSION || !Array.isArray(parsed.rooms)) {
      return [];
    }
    return parsed.rooms.filter((room) => isRoomRecord(room) && room.expiresAt > now);
  } catch (error) {
    console.warn('[rooms] Could not load snapshot:', error);
    return [];
  }
}

export function loadRoomsFromDiskSync(
  dataDir = getDefaultRoomDataDir(),
  now = Date.now(),
): RoomRecord[] {
  const filePath = getSnapshotPath(dataDir);
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as RoomSnapshotFile;
    if (parsed.version !== SNAPSHOT_VERSION || !Array.isArray(parsed.rooms)) {
      return [];
    }
    return parsed.rooms.filter((room) => isRoomRecord(room) && room.expiresAt > now);
  } catch (error) {
    console.warn('[rooms] Could not load snapshot:', error);
    return [];
  }
}

export async function saveRoomsToDisk(
  rooms: RoomRecord[],
  dataDir = getDefaultRoomDataDir(),
): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const filePath = getSnapshotPath(dataDir);
  const tmpPath = `${filePath}.tmp`;
  const payload: RoomSnapshotFile = {
    version: SNAPSHOT_VERSION,
    savedAt: Date.now(),
    rooms,
  };
  await writeFile(tmpPath, JSON.stringify(payload), 'utf8');
  await rename(tmpPath, filePath);
}
