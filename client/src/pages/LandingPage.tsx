import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@quiz-tool/shared';
import { Button } from '../components/ui/Button';
import { PageShell } from '../components/layout/PageShell';
import { useSocket } from '../hooks/useSocket';
import { saveHostSession } from '../lib/tokens';

export function LandingPage() {
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
    <PageShell title="The Quiz Tool" subtitle="Moderne live pubquiz — ikke Kahoot">
      <div className="space-y-4">
        <Button size="lg" className="w-full" onClick={createQuiz} disabled={!connected || loading}>
          {loading ? 'Oppretter…' : 'Opprett quiz'}
        </Button>
        <Button variant="secondary" size="lg" className="w-full" onClick={() => navigate('/join')}>
          Bli med som lag
        </Button>
        {!connected && (
          <p className="text-sm text-quiz-muted text-center">Kobler til server…</p>
        )}
      </div>
    </PageShell>
  );
}
