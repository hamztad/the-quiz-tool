const HOST_KEY = 'quiz_host';
const TEAM_KEY = 'quiz_team';

export interface HostSession {
  roomId: string;
  hostToken: string;
}

export interface TeamSession {
  roomId: string;
  teamId: string;
  teamToken: string;
}

export function saveHostSession(session: HostSession) {
  localStorage.setItem(HOST_KEY, JSON.stringify(session));
}

export function getHostSession(roomId: string): HostSession | null {
  try {
    const raw = localStorage.getItem(HOST_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as HostSession;
    return session.roomId === roomId ? session : null;
  } catch {
    return null;
  }
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

export function getStoredHostSession(): HostSession | null {
  try {
    const raw = localStorage.getItem(HOST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HostSession;
  } catch {
    return null;
  }
}

export function clearHostSession() {
  localStorage.removeItem(HOST_KEY);
}

export function clearTeamSession() {
  localStorage.removeItem(TEAM_KEY);
}
