import { mkdtemp, readFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import type { RoomRecord } from './roomStoreTypes.js';
import { PersistingRoomStore } from './persistingRoomStore.js';
import { getSnapshotPath, loadRoomsFromDisk, saveRoomsToDisk } from './roomPersistence.js';

function sampleRoom(overrides: Partial<RoomRecord> = {}): RoomRecord {
  const now = Date.now();
  return {
    id: 'room-test-1',
    joinCode: 'ABCD12',
    hostToken: 'host-token',
    teamTokens: {},
    teamBrowserTokens: {},
    expiresAt: now + 60 * 60_000,
    createdAt: now,
    lastActiveAt: now,
    hostPresence: { connected: false, lastSeenAt: now },
    phase: 'lobby',
    teams: [],
    teamPresence: {},
    questions: [],
    questionStatus: {},
    questionsActivated: {},
    answeredByTeam: {},
    answers: [],
    gameRounds: [],
    gameStarts: [],
    gameSubmissions: [],
    gameResults: [],
    scores: [],
    gradingAssignments: [],
    peerGrades: [],
    aiGrades: [],
    protests: [],
    revealImageProgress: [],
    activeQuestionTimers: {},
    settings: {
      showLeaderboard: false,
      teamReviewOpen: false,
      answerKeyOpen: false,
      allowNewTeams: true,
      finalResultLocked: false,
      testMode: false,
      teamsLockedOut: false,
      openAnswerGradingMode: 'peer',
    },
    ...overrides,
  };
}

describe('roomPersistence', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  async function tempDataDir(): Promise<string> {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'quiz-rooms-'));
    tempDirs.push(dir);
    return dir;
  }

  it('round-trips rooms through snapshot file', async () => {
    const dataDir = await tempDataDir();
    const room = sampleRoom();
    await saveRoomsToDisk([room], dataDir);

    const loaded = await loadRoomsFromDisk(dataDir);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.id).toBe(room.id);
    expect(loaded[0]?.joinCode).toBe(room.joinCode);

    const raw = JSON.parse(await readFile(getSnapshotPath(dataDir), 'utf8')) as {
      version: number;
    };
    expect(raw.version).toBe(1);
  });

  it('skips expired rooms on load', async () => {
    const dataDir = await tempDataDir();
    const now = Date.now();
    await saveRoomsToDisk(
      [
        sampleRoom({ id: 'active', expiresAt: now + 60_000 }),
        sampleRoom({ id: 'expired', expiresAt: now - 1 }),
      ],
      dataDir,
    );

    const loaded = await loadRoomsFromDisk(dataDir, now);
    expect(loaded.map((r) => r.id)).toEqual(['active']);
  });

  it('PersistingRoomStore restores and flushes to disk', async () => {
    const dataDir = await tempDataDir();
    const room = sampleRoom({ id: 'persist-1' });

    const store = new PersistingRoomStore(dataDir);
    store.create(room);
    await store.flush();

    const reloaded = new PersistingRoomStore(dataDir);
    expect(reloaded.get('persist-1')?.joinCode).toBe('ABCD12');
  });
});
