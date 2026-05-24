const PRESENT_KEY = 'quiz_host_present';

export type HostBuildEntry = 'editor' | 'tekst' | 'import' | 'ai';

function readPresentMap(): Record<string, boolean> {
  try {
    const raw = sessionStorage.getItem(PRESENT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writePresentMap(map: Record<string, boolean>) {
  sessionStorage.setItem(PRESENT_KEY, JSON.stringify(map));
}

export function setHostPresenting(roomId: string, presenting: boolean) {
  const map = readPresentMap();
  if (presenting) {
    map[roomId] = true;
  } else {
    delete map[roomId];
  }
  writePresentMap(map);
}

export function isHostPresenting(roomId: string): boolean {
  return readPresentMap()[roomId] === true;
}

export function clearHostPresenting(roomId?: string) {
  if (!roomId) {
    sessionStorage.removeItem(PRESENT_KEY);
    return;
  }
  const map = readPresentMap();
  delete map[roomId];
  writePresentMap(map);
}

export function parseBuildEntry(search: string): HostBuildEntry | null {
  const params = new URLSearchParams(search);
  if (params.get('import') === '1') return 'import';
  const mode = params.get('mode');
  if (mode === 'editor') return 'editor';
  if (mode === 'tekst' || mode === 'text') return 'tekst';
  if (mode === 'ai') return 'ai';
  return null;
}

export function buildEditPath(roomId: string, entry: HostBuildEntry): string {
  if (entry === 'import') return `/host/${roomId}/edit?import=1`;
  if (entry === 'tekst') return `/host/${roomId}/edit?mode=tekst`;
  if (entry === 'ai') return `/host/${roomId}/edit?mode=ai`;
  return `/host/${roomId}/edit?mode=editor`;
}

export function initialEditModeForEntry(entry: HostBuildEntry | null): 'editor' | 'tekst' {
  return entry === 'tekst' ? 'tekst' : 'editor';
}
