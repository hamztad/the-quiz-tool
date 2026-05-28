import { describe, expect, it } from 'vitest';
import { createDefaultTimerChallengeConfig, type Question } from '@quiz-tool/shared';
import { applyScheduledQuizStart, setQuizSchedule } from './timing/scheduleService.js';
import {
  createRoom,
  markHostSocketDisconnected,
  setQuestions,
} from './roomService.js';
import { checkHostReconnectAccess } from './hostRoomAccess.js';
import { sweepExpiredRooms } from './roomCleanup.js';
import { roomStore } from '../store/memoryStore.js';

const openQuestion: Question = {
  id: 'q-open',
  order: 0,
  type: 'open',
  lines: [{ text: 'Svar?', style: 'title' }],
  acceptedAnswers: ['ja'],
  maxPoints: 1,
};

const gameQuestion: Question = {
  id: 'q-game',
  order: 1,
  type: 'game',
  lines: [{ text: 'Stopp', style: 'title' }],
  maxPoints: 1,
  game: createDefaultTimerChallengeConfig(),
};

describe('host session recovery', () => {
  it('allows host reconnect with valid token after disconnect', () => {
    let room = createRoom();
    roomStore.create(room);
    const token = room.hostToken;

    roomStore.update(room.id, (r) => markHostSocketDisconnected(r));
    const disconnected = roomStore.get(room.id)!;
    expect(disconnected.hostPresence.connected).toBe(false);
    expect(disconnected.phase).toBe('lobby');

    const access = checkHostReconnectAccess(disconnected, token);
    expect(access.ok).toBe(true);
  });

  it('rejects invalid host token', () => {
    const room = createRoom();
    roomStore.create(room);
    const access = checkHostReconnectAccess(room, 'wrong-token');
    expect(access.ok).toBe(false);
    if (!access.ok) {
      expect(access.code).toBe('SESSION_INVALID');
    }
  });

  it('keeps self-running quiz alive when host disconnects', () => {
    const now = 50_000;
    let room = createRoom();
    room = setQuestions(room, [openQuestion, gameQuestion]);
    room = setQuizSchedule(
      room,
      {
        startDelayMs: 0,
        durationMs: 24 * 60 * 60_000,
        runMode: 'automatic',
        deliveryMode: 'self_paced',
      },
      now,
    );
    room = applyScheduledQuizStart(room, now);
    roomStore.create(room);

    roomStore.update(room.id, (r) => markHostSocketDisconnected(r));
    const stored = roomStore.get(room.id);
    expect(stored?.phase).toBe('live');
    expect(stored?.schedule?.enabled).toBe(true);
    expect(stored?.teams).toHaveLength(0);
  });

  it('does not remove active scheduled quiz before grace expiry', () => {
    const now = Date.now();
    let room = createRoom();
    room = setQuestions(room, [openQuestion]);
    room = setQuizSchedule(
      room,
      {
        startDelayMs: 60_000,
        durationMs: 30 * 60_000,
        runMode: 'automatic',
        deliveryMode: 'self_paced',
      },
      now,
    );
    roomStore.create(room);
    const stored = roomStore.get(room.id)!;

    const removed = sweepExpiredRooms(now + 30_000);
    expect(removed).toBe(0);
    expect(roomStore.get(room.id)).toBeDefined();

    sweepExpiredRooms(stored.expiresAt + 1);
    expect(roomStore.get(room.id)).toBeUndefined();
  });
});
