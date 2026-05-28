import {
  getHostSessionEntry,
  listHostSessions,
  registerHostSession,
  removeHostSession,
} from './hostActiveSessions';

const TEAM_KEY = 'quiz_team';
const BROWSER_TEAM_TOKEN_KEY = 'teamToken';

export interface HostSession {
  roomId: string;
  hostToken: string;
}

export interface TeamSession {
  roomId: string;
  teamId: string;
  teamToken: string;
  browserToken?: string;
  teamName?: string;
  joinCode?: string;
  isTestParticipant?: boolean;
}

function generateBrowserToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `browser-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateBrowserTeamToken(): string {
  try {
    const existing = localStorage.getItem(BROWSER_TEAM_TOKEN_KEY);
    if (existing) return existing;
    const token = generateBrowserToken();
    localStorage.setItem(BROWSER_TEAM_TOKEN_KEY, token);
    return token;
  } catch {
    return generateBrowserToken();
  }
}

export function saveHostSession(
  session: HostSession,
  meta?: { title?: string; joinCode?: string },
): void {
  registerHostSession({
    roomId: session.roomId,
    hostToken: session.hostToken,
    title: meta?.title?.trim() || `Quiz ${meta?.joinCode ?? session.roomId.slice(-6)}`,
    joinCode: meta?.joinCode,
  });
}

export function getHostSession(roomId: string): HostSession | null {
  const entry = getHostSessionEntry(roomId);
  if (!entry) return null;
  return { roomId: entry.roomId, hostToken: entry.hostToken };
}

export function saveTeamSession(session: TeamSession) {
  localStorage.setItem(TEAM_KEY, JSON.stringify(session));
}

export function getTeamSession(roomId: string): TeamSession | null {
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as TeamSession;
    return session.roomId === roomId ? session : null;
  } catch {
    return null;
  }
}

export function getStoredTeamSession(): TeamSession | null {
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TeamSession;
  } catch {
    return null;
  }
}

export function getStoredHostSession(): HostSession | null {
  const [first] = listHostSessions();
  if (!first) return null;
  return { roomId: first.roomId, hostToken: first.hostToken };
}

export function clearHostSession(roomId?: string) {
  if (roomId) {
    removeHostSession(roomId);
    return;
  }
  for (const entry of listHostSessions()) {
    removeHostSession(entry.roomId);
  }
}

export function clearTeamSession() {
  localStorage.removeItem(TEAM_KEY);
}
