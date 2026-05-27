import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@quiz-tool/shared';
import { HostPhaseIndicator } from '../components/host/HostPhaseIndicator';
import { HostSetupCard } from '../components/host/HostSetupCard';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { buildEditPath, type HostBuildEntry } from '../lib/hostFlow';
import { getStoredHostSession, saveHostSession } from '../lib/tokens';
import { useSocket } from '../hooks/useSocket';

export function HostLandingPage() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [loading, setLoading] = useState<HostBuildEntry | 'continue' | null>(null);
  const existingSession = getStoredHostSession();

  const createQuiz = (entry: HostBuildEntry) => {
    setLoading(entry);
    const onCreated = (data: { roomId: string; hostToken: string }) => {
      setLoading(null);
      saveHostSession({ roomId: data.roomId, hostToken: data.hostToken });
      navigate(buildEditPath(data.roomId, entry));
    };
    socket.once(SERVER_EVENTS.ROOM_CREATED, onCreated);
    socket.emit(CLIENT_EVENTS.ROOM_CREATE, {}, (res: { roomId: string; hostToken: string } | undefined) => {
      if (res?.roomId) onCreated(res);
    });
  };

  const continueQuiz = () => {
    if (!existingSession) return;
    setLoading('continue');
    navigate(`/host/${existingSession.roomId}`);
    setLoading(null);
  };

  const busy = loading !== null;

  return (
    <PageShell
      title="Quizmaster"
      subtitle="Kontrollrommet for live quiz — bygg, presenter og kjør showet"
      emoji="🎤"
      wide
    >
      <HostPhaseIndicator active="build" />

      <div className="w-full min-w-0 max-w-full space-y-4">
        <p className="rounded-2xl border border-violet-200/50 bg-violet-50/60 px-4 py-3 text-sm sm:text-base text-quiz-muted leading-relaxed break-words">
          Velg hvordan du vil bygge quizen. QR-kode og romkode vises når du er klar til å invitere
          deltakerne.
        </p>

        <HostSetupCard
          title="Ny quiz i editor"
          description="Legg til spørsmål ett og ett med spørsmålskort."
          icon="✏️"
          tone="purple"
          onClick={() => createQuiz('editor')}
          disabled={!connected || busy}
        />
        <HostSetupCard
          title="Ny quiz med tekst"
          description="Kopier AI-prompt, lim inn svar — eller skriv quizen direkte som tekst."
          icon="📝"
          tone="cyan"
          onClick={() => createQuiz('tekst')}
          disabled={!connected || busy}
        />
        <HostSetupCard
          title="Importer quizfil"
          description="Last opp en JSON-backup fra The Quiz Tool."
          icon="📦"
          tone="orange"
          onClick={() => createQuiz('import')}
          disabled={!connected || busy}
        />
        <HostSetupCard
          title="Generer med AI"
          description="Velg tema og antall spørsmål — rediger i editoren før du presenterer."
          icon="🧠"
          tone="pink"
          onClick={() => createQuiz('ai')}
          disabled={!connected || busy}
        />

        {loading && loading !== 'continue' && (
          <p className="text-sm text-quiz-muted text-center font-medium" role="status">
            ✨ Oppretter quizrom…
          </p>
        )}
        {!connected && (
          <p className="text-sm text-quiz-muted text-center">Kobler til server…</p>
        )}

        {existingSession && (
          <div className="rounded-2xl border-2 border-violet-300/50 bg-gradient-to-br from-violet-50/90 to-white/95 p-5 space-y-3 shadow-md">
            <p className="quiz-display text-lg font-bold text-quiz-text">Fortsett påbegynt quiz</p>
            <p className="text-sm text-quiz-muted break-words">
              Du har en aktiv quizmaster-økt. Fortsett der du slapp.
            </p>
            <Button
              size="lg"
              variant="cta"
              className="w-full"
              onClick={continueQuiz}
              disabled={!connected || busy}
            >
              🚀 {loading === 'continue' ? 'Åpner…' : 'Fortsett quiz'}
            </Button>
          </div>
        )}

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
