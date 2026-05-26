import type { RoomSettings, TeamPresence } from '../types/room.js';

export const TEAM_RECONNECT_GRACE_MS = 5 * 60 * 1000;

export function createConnectedTeamPresence(teamId: string, now = Date.now()): TeamPresence {
  return {
    teamId,
    status: 'connected',
    connectedAt: now,
    lastSeenAt: now,
    disconnectedAt: undefined,
    reconnectUntil: undefined,
  };
}

export function markTeamConnected(
  current: TeamPresence | undefined,
  teamId: string,
  now = Date.now(),
): TeamPresence {
  return {
    ...current,
    teamId,
    status: 'connected',
    connectedAt: current?.connectedAt ?? now,
    lastSeenAt: now,
    disconnectedAt: undefined,
    reconnectUntil: undefined,
  };
}

export function markTeamDisconnected(
  current: TeamPresence | undefined,
  teamId: string,
  now = Date.now(),
  graceMs = TEAM_RECONNECT_GRACE_MS,
): TeamPresence {
  return {
    ...current,
    teamId,
    status: 'disconnected',
    connectedAt: current?.connectedAt,
    disconnectedAt: now,
    lastSeenAt: now,
    reconnectUntil: now + graceMs,
  };
}

export function isReconnectGraceActive(presence: TeamPresence | undefined, now = Date.now()): boolean {
  if (!presence || presence.status !== 'disconnected') return false;
  return typeof presence.reconnectUntil === 'number' && presence.reconnectUntil >= now;
}

export function canCreateNewTeam(settings: Pick<RoomSettings, 'allowNewTeams'>): boolean {
  return settings.allowNewTeams !== false;
}

export function formatDisconnectedDuration(disconnectedAt: number | undefined, now = Date.now()): string {
  if (!disconnectedAt) return 'frakoblet';
  const seconds = Math.max(0, Math.floor((now - disconnectedAt) / 1000));
  if (seconds < 60) return 'frakoblet nå';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `frakoblet i ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `frakoblet i ${hours} t`;
}
