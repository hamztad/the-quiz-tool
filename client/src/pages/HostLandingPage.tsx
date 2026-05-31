import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@quiz-tool/shared';
import { HostPhaseIndicator } from '../components/host/HostPhaseIndicator';
import { HostSetupCard } from '../components/host/HostSetupCard';
import { PageShell } from '../components/layout/PageShell';
import { buildEditPath, type HostBuildEntry } from '../lib/hostFlow';
import { HostActiveSessionsPanel } from '../components/host/HostActiveSessionsPanel';
import { saveHostSession } from '../lib/tokens';
import { useSocket } from '../hooks/useSocket';

export function HostLandingPage() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [loading, setLoading] = useState<HostBuildEntry | null>(null);

  const createQuiz = (entry: HostBuildEntry) => {
    setLoading(entry);
    const onCreated = (data: { roomId: string; hostToken: string }) => {
      setLoading(null);
      saveHostSession(
        { roomId: data.roomId, hostToken: data.hostToken },
        { title: 'Ny quiz', joinCode: (data as { joinCode?: string }).joinCode },
      );
      navigate(buildEditPath(data.roomId, entry));
    };
    socket.once(SERVER_EVENTS.ROOM_CREATED, onCreated);
    socket.emit(CLIENT_EVENTS.ROOM_CREATE, {}, (res: { roomId: string; hostToken: string } | undefined) => {
      if (res?.roomId) onCreated(res);
    });
  };

  const busy = loading !== null;

  return (
    <PageShell
      showBrand="compact"
      title="Gruizmaster"
      subtitle="Kontrollrommet for Gruiz — bygg, presenter og kjør showet"
      emoji="🎤"
      wide
    >
      <HostPhaseIndicator active="build" />

      <div className="w-full min-w-0 max-w-full space-y-4">
        <p className="rounded-2xl border border-violet-200/50 bg-violet-50/60 px-4 py-3 text-sm sm:text-base text-quiz-muted leading-relaxed break-words">
          Velg hvordan du vil bygge Gruizen. QR-kode og romkode vises når du er klar til å invitere
          deltakerne.
        </p>

        <HostSetupCard
          title="Ny Gruiz i editor"
          description="Legg til spørsmål ett og ett med spørsmålskort."
          icon="✏️"
          tone="purple"
          onClick={() => createQuiz('editor')}
          disabled={!connected || busy}
        />
        <HostSetupCard
          title="Ny Gruiz med tekst"
          description="Kopier AI-prompt, lim inn svar — eller skriv Gruizen direkte som tekst."
          icon="📝"
          tone="cyan"
          onClick={() => createQuiz('tekst')}
          disabled={!connected || busy}
        />
        <HostSetupCard
          title="Importer Gruiz-fil"
          description="Last opp en JSON-backup fra Gruiz."
          icon="📦"
          tone="orange"
          onClick={() => createQuiz('import')}
          disabled={!connected || busy}
        />
        <HostSetupCard
          title="AI-shop"
          description="Lag Gruiz med KI — rediger i editoren før du presenterer."
          icon="🧠"
          tone="pink"
          onClick={() => createQuiz('ai')}
          disabled={!connected || busy}
        />

        {loading && (
          <p className="text-sm text-quiz-muted text-center font-medium" role="status">
            ✨ Oppretter Gruiz-rom…
          </p>
        )}
        {!connected && (
          <p className="text-sm text-quiz-muted text-center">Kobler til server…</p>
        )}

        <HostActiveSessionsPanel connected={connected} />

        <p className="text-center text-sm text-quiz-muted pt-2">
          Skal du delta som deltaker?{' '}
          <Link
            to="/join"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-cyan-700 hover:text-cyan-900 underline-offset-2 hover:underline"
          >
            👥 Deltakerportal (ny fane)
          </Link>
        </p>

        <p className="text-center">
          <Link to="/" className="text-sm text-quiz-muted hover:text-violet-700 font-medium">
            ← Tilbake til forsiden
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
