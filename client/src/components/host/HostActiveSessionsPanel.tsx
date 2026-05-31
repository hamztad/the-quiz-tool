import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHostSessionStatusLabel, type HostRoomSummary } from '@quiz-tool/shared';
import { fetchHostSessionSummary } from '../../lib/hostSessionApi';
import {
  listHostSessions,
  removeHostSession,
  type StoredHostSession,
} from '../../lib/hostActiveSessions';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ListedHostSession {
  stored: StoredHostSession;
  summary?: HostRoomSummary;
  inactive?: boolean;
  error?: string;
}

function formatLastSeen(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'Sett nå nettopp';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `Sett for ${minutes} min siden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `Sett for ${hours} t siden`;
  return `Sett ${new Date(ms).toLocaleDateString('nb-NO')}`;
}

export function HostActiveSessionsPanel({ connected }: { connected: boolean }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ListedHostSession[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const stored = listHostSessions();
    if (stored.length === 0) {
      setSessions([]);
      return;
    }
    setLoading(true);
    const results = await Promise.all(
      stored.map(async (entry) => {
        const response = await fetchHostSessionSummary(entry);
        if (!response.ok) {
          if (
            response.code === 'SESSION_INVALID' ||
            response.code === 'ROOM_NOT_FOUND' ||
            response.code === 'ROOM_EXPIRED'
          ) {
            removeHostSession(entry.roomId);
          }
          return {
            stored: entry,
            inactive: true,
            error: response.message,
          } satisfies ListedHostSession;
        }
        return {
          stored: entry,
          summary: response.summary,
        } satisfies ListedHostSession;
      }),
    );
    setSessions(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, connected]);

  if (sessions.length === 0 && !loading) {
    return null;
  }

  return (
    <section className="rounded-2xl border-2 border-violet-300/50 bg-gradient-to-br from-violet-50/90 to-white/95 p-5 space-y-4 shadow-md">
      <div>
        <h2 className="quiz-display text-lg font-bold text-quiz-text">Fortsett aktive quizer</h2>
        <p className="mt-1 text-sm text-quiz-muted leading-relaxed">
          Vi fant aktive Gruizmaster-økter i denne nettleseren. Fortsett der du slapp — uten permanent
          lagring i skyen.
        </p>
      </div>

      <div className="space-y-3">
        {sessions.map(({ stored, summary, inactive, error }) => {
          const title = summary?.title ?? stored.title;
          const status = summary
            ? getHostSessionStatusLabel(summary)
            : inactive
              ? 'Ikke aktiv'
              : '…';
          const code = summary?.joinCode ?? stored.joinCode;

          return (
            <Card key={stored.roomId} className="p-4 space-y-3 border-violet-200/60">
              <div className="min-w-0">
                <p className="font-bold text-quiz-text break-words [overflow-wrap:anywhere]">{title}</p>
                <p className="mt-1 text-sm text-quiz-muted">
                  {code && <span className="font-semibold tabular-nums">{code}</span>}
                  {code && ' · '}
                  <span>{status}</span>
                </p>
                <p className="mt-0.5 text-xs text-quiz-muted">{formatLastSeen(stored.lastSeenAt)}</p>
                {inactive && error && (
                  <p className="mt-2 text-sm text-amber-900">{error}</p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="cta"
                  className="flex-1"
                  disabled={!connected || inactive}
                  onClick={() => navigate(`/host/${stored.roomId}`)}
                >
                  Fortsett
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    removeHostSession(stored.roomId);
                    void refresh();
                  }}
                >
                  Fjern fra listen
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {loading && (
        <p className="text-sm text-quiz-muted text-center" role="status">
          Oppdaterer aktive quizer…
        </p>
      )}
    </section>
  );
}
