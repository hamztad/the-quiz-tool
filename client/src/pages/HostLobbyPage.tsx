import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CLIENT_EVENTS } from '@quiz-tool/shared';
import { HostPhaseIndicator } from '../components/host/HostPhaseIndicator';
import { JoinCodeDisplay } from '../components/host/JoinCodeDisplay';
import { RoomUnavailableView } from '../components/room/RoomUnavailableView';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { buildParticipantJoinUrl } from '../lib/joinUrls';
import { isHostPresenting, setHostPresenting } from '../lib/hostFlow';
import { useRoomGate } from '../hooks/useRoomGate';
import { useSocket } from '../hooks/useSocket';

export function HostLobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteFromLive = searchParams.get('invite') === '1';
  const { socket, connected } = useSocket();
  const { room, unavailable, loading, noSession, operationalError } = useRoomGate(
    roomId,
    'host',
    socket,
    connected,
  );

  useEffect(() => {
    if (!roomId || !room) return;
    if (room.questions.length === 0) {
      navigate(`/host/${roomId}/edit`, { replace: true });
      return;
    }
    if (room.phase === 'lobby' && !isHostPresenting(roomId)) {
      navigate(`/host/${roomId}/edit`, { replace: true });
    }
  }, [room, roomId, navigate]);

  useEffect(() => {
    if (!roomId || !room || inviteFromLive) return;
    if (room.phase === 'live' && isHostPresenting(roomId)) {
      navigate(`/host/${roomId}`, { replace: true });
    }
  }, [room?.phase, roomId, navigate, inviteFromLive]);

  if (!roomId) return null;

  if (unavailable) {
    return <RoomUnavailableView reason={unavailable} />;
  }

  if (noSession) {
    return <RoomUnavailableView reason="not_found" />;
  }

  if (loading || !room) {
    return (
      <PageShell title="Presenter quiz" subtitle="Kobler til quizrom…">
        <p className="text-sm text-quiz-muted text-center py-12">Laster…</p>
      </PageShell>
    );
  }

  const joinUrl = buildParticipantJoinUrl(room.joinCode);
  const canStart = room.questions.length > 0 && room.phase === 'lobby';
  const inviteOnly = room.phase !== 'lobby';

  const startQuiz = () => {
    socket.emit(CLIENT_EVENTS.QUIZ_START);
  };

  const leavePresent = () => {
    if (inviteOnly) {
      navigate(`/host/${roomId}`);
      return;
    }
    setHostPresenting(roomId, false);
    navigate(`/host/${roomId}/edit`);
  };

  return (
    <PageShell
      title={inviteOnly ? 'Invitasjon til lag' : 'Presenter quiz'}
      subtitle={
        inviteOnly
          ? 'QR-kode og romkode for lag som skal bli med'
          : 'Inviter lag med QR-kode eller romkode — start når alle er klare'
      }
    >
      <HostPhaseIndicator active={inviteOnly ? 'live' : 'present'} />

      {operationalError && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 break-words">
          {operationalError}
        </p>
      )}

      <div className="w-full min-w-0 max-w-full space-y-6">
        <JoinCodeDisplay joinCode={room.joinCode} joinUrl={joinUrl} />

        <Card>
          <h2 className="font-semibold mb-3">Lag ({room.teams.length})</h2>
          <ul className="space-y-2">
            {room.teams.map((t) => (
              <li
                key={t.id}
                className="text-sm font-medium break-words [overflow-wrap:anywhere]"
              >
                {t.name}
              </li>
            ))}
            {room.teams.length === 0 && (
              <p className="text-quiz-muted text-sm">Venter på lag — del QR-koden eller romkoden.</p>
            )}
          </ul>
        </Card>

        <div className="w-full min-w-0 space-y-3">
          {canStart && (
            <Button
              size="lg"
              className="w-full"
              onClick={startQuiz}
              disabled={!connected}
            >
              Start quiz
            </Button>
          )}
          <Button size="lg" variant="secondary" className="w-full" onClick={leavePresent}>
            {inviteOnly ? 'Tilbake til kjøring' : 'Tilbake og rediger quiz'}
          </Button>
          <p className="text-center text-xs text-quiz-muted">
            <Link to="/host" className="hover:text-quiz-accent underline-offset-2 hover:underline">
              Ny quizmaster-økt
            </Link>
          </p>
        </div>
      </div>
    </PageShell>
  );
}
