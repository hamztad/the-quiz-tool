import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@quiz-tool/shared';
import { Button } from '../components/ui/Button';
import { PageShell } from '../components/layout/PageShell';
import { useSocket } from '../hooks/useSocket';
import { saveHostSession } from '../lib/tokens';

export function HostLandingPage() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [loading, setLoading] = useState(false);

  const createQuiz = () => {
    setLoading(true);
    const onCreated = (data: { roomId: string; hostToken: string }) => {
      setLoading(false);
      saveHostSession({ roomId: data.roomId, hostToken: data.hostToken });
      navigate(`/host/${data.roomId}`);
    };
    socket.once(SERVER_EVENTS.ROOM_CREATED, onCreated);
    socket.emit(CLIENT_EVENTS.ROOM_CREATE, {}, (res: { roomId: string; hostToken: string } | undefined) => {
      if (res?.roomId) onCreated(res);
    });
  };

  return (
    <PageShell title="Quizmaster" subtitle="Opprett og administrer din live-quiz">
      <div className="space-y-6">
        <div className="rounded-2xl border border-quiz-border bg-quiz-surface-elevated p-5 space-y-4">
          <p className="text-sm text-quiz-muted leading-relaxed">
            Start et nytt quizrom, legg til spørsmål, vis QR-kode for lagene og styr quizen underveis.
          </p>
          <Button size="lg" className="w-full" onClick={createQuiz} disabled={!connected || loading}>
            {loading ? 'Oppretter rom…' : 'Opprett ny quiz'}
          </Button>
          {!connected && (
            <p className="text-sm text-quiz-muted text-center">Kobler til server…</p>
          )}
        </div>

        <p className="text-center text-xs text-quiz-muted">
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
