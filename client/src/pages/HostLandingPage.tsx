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
      subtitle="Først lager du quizen — deretter inviterer du lag og kjører live"
    >
      <HostPhaseIndicator active="build" />

      <div className="w-full min-w-0 max-w-full space-y-4">
        <p className="text-sm text-quiz-muted leading-relaxed break-words">
          Velg hvordan du vil bygge quizen. QR-kode og romkode vises først når du er klar til å
          presentere for lagene.
        </p>

        <HostSetupCard
          title="Ny quiz i editor"
          description="Legg til spørsmål ett og ett med spørsmålskort."
          icon="✏️"
          onClick={() => createQuiz('editor')}
          disabled={!connected || busy}
        />
        <HostSetupCard
          title="Ny quiz med tekst"
          description="Kopier AI-prompt, lim inn svar — eller skriv quizen direkte som tekst."
          icon="📝"
          onClick={() => createQuiz('tekst')}
          disabled={!connected || busy}
        />
        <HostSetupCard
          title="Importer quizfil"
          description="Last opp en JSON-backup fra The Quiz Tool."
          icon="📁"
          onClick={() => createQuiz('import')}
          disabled={!connected || busy}
        />

        {loading && loading !== 'continue' && (
          <p className="text-sm text-quiz-muted text-center" role="status">
            Oppretter quizrom…
          </p>
        )}
        {!connected && (
          <p className="text-sm text-quiz-muted text-center">Kobler til server…</p>
        )}

        {existingSession && (
          <div className="rounded-2xl border border-quiz-accent/30 bg-quiz-accent/10 p-5 space-y-3">
            <p className="text-sm font-semibold text-quiz-text">Fortsett påbegynt quiz</p>
            <p className="text-xs text-quiz-muted break-words">
              Du har en aktiv quizmaster-økt. Fortsett der du slapp.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={continueQuiz}
              disabled={!connected || busy}
            >
              {loading === 'continue' ? 'Åpner…' : 'Fortsett quiz'}
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-quiz-muted pt-2">
          Skal du delta som lag?{' '}
          <Link to="/join" className="text-quiz-muted hover:text-quiz-accent underline-offset-2 hover:underline">
            Deltakerportal
          </Link>
        </p>

        <p className="text-center">
          <Link to="/" className="text-xs text-quiz-muted hover:text-quiz-text">
            ← Tilbake til forsiden
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
