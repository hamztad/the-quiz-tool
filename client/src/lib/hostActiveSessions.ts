import type { StoredHostSession } from '@quiz-tool/shared';

const HOST_REGISTRY_KEY = 'quiz_host_sessions';
const LEGACY_HOST_KEY = 'quiz_host';

export type { StoredHostSession };

function readRegistryRaw(): StoredHostSession[] {
  try {
    const raw = localStorage.getItem(HOST_REGISTRY_KEY);
    if (!raw) return migrateLegacySession();
    const parsed = JSON.parse(raw) as StoredHostSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) =>
        entry &&
        typeof entry.roomId === 'string' &&
        typeof entry.hostToken === 'string' &&
        typeof entry.title === 'string',
    );
  } catch {
    return [];
  }
}

function migrateLegacySession(): StoredHostSession[] {
  try {
    const legacy = localStorage.getItem(LEGACY_HOST_KEY);
    if (!legacy) return [];
    const session = JSON.parse(legacy) as StoredHostSession;
    if (!session?.roomId || !session?.hostToken) return [];
    const now = Date.now();
    const entry: StoredHostSession = {
      roomId: session.roomId,
      hostToken: session.hostToken,
      title: session.title?.trim() || `Quiz ${session.joinCode ?? session.roomId.slice(-6)}`,
      joinCode: session.joinCode,
      createdAt: session.createdAt ?? now,
      lastSeenAt: session.lastSeenAt ?? now,
    };
    writeRegistryRaw([entry]);
    localStorage.removeItem(LEGACY_HOST_KEY);
    return [entry];
  } catch {
    return [];
  }
}

function writeRegistryRaw(entries: StoredHostSession[]): void {
  localStorage.setItem(HOST_REGISTRY_KEY, JSON.stringify(entries));
}

export function listHostSessions(): StoredHostSession[] {
  return readRegistryRaw().sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}

export function registerHostSession(entry: Omit<StoredHostSession, 'lastSeenAt' | 'createdAt'> & {
  lastSeenAt?: number;
  createdAt?: number;
}): StoredHostSession {
  const now = Date.now();
  const next: StoredHostSession = {
    roomId: entry.roomId,
    hostToken: entry.hostToken,
    title: entry.title.trim() || `Quiz ${entry.joinCode ?? entry.roomId.slice(-6)}`,
    joinCode: entry.joinCode,
    createdAt: entry.createdAt ?? now,
    lastSeenAt: entry.lastSeenAt ?? now,
  };
  const rest = readRegistryRaw().filter((item) => item.roomId !== next.roomId);
  writeRegistryRaw([next, ...rest]);
  return next;
}

export function touchHostSession(roomId: string, patch: Partial<Pick<StoredHostSession, 'title' | 'joinCode'>>): void {
  const now = Date.now();
  const entries = readRegistryRaw();
  const index = entries.findIndex((item) => item.roomId === roomId);
  if (index === -1) return;
  entries[index] = {
    ...entries[index],
    ...patch,
    lastSeenAt: now,
  };
  writeRegistryRaw(entries.sort((a, b) => b.lastSeenAt - a.lastSeenAt));
}

export function removeHostSession(roomId: string): void {
  writeRegistryRaw(readRegistryRaw().filter((item) => item.roomId !== roomId));
}

export function getHostSessionEntry(roomId: string): StoredHostSession | null {
  return readRegistryRaw().find((item) => item.roomId === roomId) ?? null;
}
