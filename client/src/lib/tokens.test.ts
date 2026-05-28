// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { getHostSessionEntry, listHostSessions } from './hostActiveSessions';
import { clearHostSession, getHostSession, saveHostSession } from './tokens';

describe('host tokens bridge', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('registers host session in multi-session registry', () => {
    saveHostSession(
      { roomId: 'room-1', hostToken: 'secret-token' },
      { title: 'Testquiz', joinCode: 'ABCD' },
    );
    expect(getHostSession('room-1')).toEqual({
      roomId: 'room-1',
      hostToken: 'secret-token',
    });
    expect(getHostSessionEntry('room-1')?.title).toBe('Testquiz');
  });

  it('clears one room without removing others', () => {
    saveHostSession({ roomId: 'a', hostToken: 'ta' }, { title: 'A' });
    saveHostSession({ roomId: 'b', hostToken: 'tb' }, { title: 'B' });
    clearHostSession('a');
    expect(listHostSessions()).toHaveLength(1);
    expect(getHostSession('b')?.hostToken).toBe('tb');
  });
});
