// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import {
  getHostSessionEntry,
  listHostSessions,
  registerHostSession,
  removeHostSession,
} from './hostActiveSessions';

describe('hostActiveSessions storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and lists multiple host sessions', () => {
    registerHostSession({
      roomId: 'room-a',
      hostToken: 'token-a',
      title: 'Quiz A',
      joinCode: 'AAAA',
    });
    registerHostSession({
      roomId: 'room-b',
      hostToken: 'token-b',
      title: 'Quiz B',
      joinCode: 'BBBB',
    });

    const sessions = listHostSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions.map((item) => item.roomId)).toContain('room-a');
    expect(getHostSessionEntry('room-b')?.title).toBe('Quiz B');
  });

  it('removes a session locally without affecting others', () => {
    registerHostSession({
      roomId: 'room-a',
      hostToken: 'token-a',
      title: 'Quiz A',
    });
    registerHostSession({
      roomId: 'room-b',
      hostToken: 'token-b',
      title: 'Quiz B',
    });
    removeHostSession('room-a');
    expect(listHostSessions()).toHaveLength(1);
    expect(listHostSessions()[0]?.roomId).toBe('room-b');
  });
});
