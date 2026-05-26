import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CLIENT_EVENTS } from '@quiz-tool/shared';
import { HostPhaseIndicator } from '../components/host/HostPhaseIndicator';
import { HostTeamList } from '../components/host/HostTeamList';
import { JoinCodeDisplay } from '../components/host/JoinCodeDisplay';
import { RoomUnavailableView } from '../components/room/RoomUnavailableView';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { buildParticipantJoinUrl } from '../lib/joinUrls';
import { isHostPresenting, setHostPresenting } from '../lib/hostFlow';
import { quizContentHash, readHostDraftSession, markHostDraftExported } from '../lib/hostDraftSession';
import { useRoomGate } from '../hooks/useRoomGate';
import { useSocket } from '../hooks/useSocket';
import { useUnsavedQuizGuard } from '../hooks/useUnsavedQuizGuard';

export function HostLobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteFromLive = searchParams.get('invite') === '1';
  const { socket, connected } = useSocket();
  const [exportedHash, setExportedHash] = useState('');
  const { room, unavailable, loading, noSession, operationalError } = useRoomGate(
    roomId,
    'host',
    socket,
    connected,
  );
  const activeQuestions = room?.questions ?? [];
  const activeQuestionsHash = quizContentHash(activeQuestions);
  const hasUnexportedQuiz = activeQuestions.length > 0 && exportedHash !== activeQuestionsHash;
  const { requestLeave, dialog: unexportedDialog } = useUnsavedQuizGuard({
    dirty: false,
    hasUnexportedQuiz,
    questions: activeQuestions,
    quizTitle: room?.joinCode,
    onExported: () => {
      if (!roomId) return;
      markHostDraftExported(roomId, activeQuestions);
      setExportedHash(quizContentHash(activeQuestions));
    },
  });

  useEffect(() => {
    if (!roomId || activeQuestions.length === 0) return;
    setExportedHash(readHostDraftSession(roomId)?.exportedHash ?? '');
  }, [roomId, activeQuestionsHash, activeQuestions.length]);

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

  const removeTeamFromQuiz = (teamId: string, teamName: string) => {
    if (
      !window.confirm(
        `Kaste ut «${teamName}»?\n\nLagets svar og poeng fjernes hvis quizen allerede er i gang.`,
      )
    ) {
      return;
    }
    socket.emit(CLIENT_EVENTS.TEAM_REMOVE, { teamId });
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
      <HostPhaseIndicator
        active="present"
        links={
          inviteOnly
            ? { live: `/host/${roomId}` }
            : room.questions.length > 0
              ? { build: `/host/${roomId}/edit` }
              : undefined
        }
      />

      {operationalError && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300 break-words">
          {operationalError}
        </p>
      )}

      <div className="w-full min-w-0 max-w-full space-y-6">
        <JoinCodeDisplay joinCode={room.joinCode} joinUrl={joinUrl} />

        <div className="rounded-2xl border border-quiz-border bg-quiz-surface-elevated/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-quiz-text">Tillat nye lag</p>
              <p className="mt-1 text-xs text-quiz-muted">
                Reconnect til eksisterende lag fungerer fortsatt når nye lag er stengt.
              </p>
            </div>
            <Button
              type="button"
              variant={room.settings.allowNewTeams ? 'secondary' : 'primary'}
              onClick={() =>
                socket.emit(CLIENT_EVENTS.TEAM_JOIN_TOGGLE, {
                  allowNewTeams: !room.settings.allowNewTeams,
                })
              }
            >
              {room.settings.allowNewTeams ? 'Steng for nye lag' : 'Åpne for nye lag'}
            </Button>
          </div>
          {!room.settings.allowNewTeams && (
            <p className="mt-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
              Nye lag er stengt. Lag som allerede er med kan koble til igjen.
            </p>
          )}
        </div>

        <HostTeamList
          room={room}
          onRemoveTeam={removeTeamFromQuiz}
          emptyHint="Venter på deltakere — del QR-koden eller romkoden."
        />

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
            <button
              type="button"
              onClick={() => requestLeave(() => navigate('/host'))}
              className="hover:text-quiz-accent underline-offset-2 hover:underline"
            >
              Ny quizmaster-økt
            </button>
          </p>
        </div>
      </div>
      {unexportedDialog}
    </PageShell>
  );
}
