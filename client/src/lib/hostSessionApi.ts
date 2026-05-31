import type { HostRoomSummary } from '@quiz-tool/shared';
import type { StoredHostSession } from './hostActiveSessions';

interface SessionSummarySuccess {
  ok: true;
  summary: HostRoomSummary;
}

interface SessionSummaryError {
  ok: false;
  code?: string;
  message: string;
}

export async function fetchHostSessionSummary(
  session: Pick<StoredHostSession, 'roomId' | 'hostToken'>,
): Promise<SessionSummarySuccess | SessionSummaryError> {
  const params = new URLSearchParams({ roomId: session.roomId });
  const res = await fetch(`/api/host/session-summary?${params.toString()}`, {
    headers: {
      'X-Host-Token': session.hostToken,
    },
  });
  const raw = await res.text();
  try {
    const data = JSON.parse(raw) as SessionSummarySuccess | SessionSummaryError;
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        code: !data.ok ? data.code : undefined,
        message: !data.ok ? data.message : 'Denne Gruizen er ikke lenger aktiv.',
      };
    }
    return data;
  } catch {
    return { ok: false, message: 'Kunne ikke kontakte serveren. Sjekk at backend kjører.' };
  }
}
