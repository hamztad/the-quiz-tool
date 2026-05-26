import { describe, expect, it } from 'vitest';
import {
  canCreateNewTeam,
  createConnectedTeamPresence,
  formatDisconnectedDuration,
  isReconnectGraceActive,
  markTeamConnected,
  markTeamDisconnected,
} from './sessionProtection.js';

describe('session protection helpers', () => {
  it('marks teams connected and disconnected without dropping state', () => {
    const connected = createConnectedTeamPresence('team1', 1_000);
    expect(connected.status).toBe('connected');

    const disconnected = markTeamDisconnected(connected, 'team1', 2_000, 5_000);
    expect(disconnected.status).toBe('disconnected');
    expect(disconnected.reconnectUntil).toBe(7_000);

    const reconnected = markTeamConnected(disconnected, 'team1', 3_000);
    expect(reconnected.status).toBe('connected');
    expect(reconnected.disconnectedAt).toBeUndefined();
  });

  it('tracks reconnect timeout grace window', () => {
    const disconnected = markTeamDisconnected(undefined, 'team1', 10_000, 5_000);
    expect(isReconnectGraceActive(disconnected, 14_999)).toBe(true);
    expect(isReconnectGraceActive(disconnected, 15_001)).toBe(false);
  });

  it('allows reconnect even when new teams are locked by checking settings separately', () => {
    expect(canCreateNewTeam({ allowNewTeams: true })).toBe(true);
    expect(canCreateNewTeam({ allowNewTeams: false })).toBe(false);
  });

  it('formats disconnected duration for host visibility', () => {
    expect(formatDisconnectedDuration(0, 30_000)).toBe('frakoblet');
    expect(formatDisconnectedDuration(10_000, 40_000)).toBe('frakoblet nå');
    expect(formatDisconnectedDuration(10_000, 130_000)).toBe('frakoblet i 2 min');
  });
});
