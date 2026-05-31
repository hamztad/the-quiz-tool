import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { HostTestModeControls } from '../components/host/HostTestModeControls';
import { HostReconnectBanner } from '../components/host/HostReconnectBanner';
import { HostSelfPacedReconnectBanner } from '../components/host/HostSelfPacedReconnectBanner';
import { HostScheduleCard } from '../components/timing/HostScheduleCard';
import { LiveQuizClock } from '../components/timing/LiveQuizClock';
import { QuizBackupPanel } from '../components/host/QuizBackupPanel';
import { emitTestSessionEnd, emitTestSessionStart } from '../lib/testSession';
import { clearTeamSession } from '../lib/tokens';
import { isQuestionIncomplete } from '../lib/questionFactory';

export function HostLobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteFromLive = searchParams.get('invite') === '1';
  const { socket, connected } = useSocket();
  const [exportedHash, setExportedHash] = useState('');
  const [testBusy, setTestBusy] = useState<'start' | 'end' | null>(null);
  const {
    room,
    unavailable,
    unavailableDetail,
    loading,
    noSession,
    operationalError,
    hostReconnectNotice,
    dismissHostReconnectNotice,
    selfPacedReconnectNotice,
    dismissSelfPacedReconnectNotice,
  } = useRoomGate(roomId, 'host', socket, connected);
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
    return <RoomUnavailableView reason={unavailable} detail={unavailableDetail} />;
  }

  if (noSession) {
    return <RoomUnavailableView reason="not_found" />;
  }

  if (loading || !room) {
    return (
      <PageShell showBrand="compact" title="Presenter Gruiz" subtitle="Kobler til Gruiz-rom…">
        <p className="text-sm text-quiz-muted text-center py-12">Laster…</p>
      </PageShell>
    );
  }

  const joinUrl = buildParticipantJoinUrl(room.joinCode);
  const canStart = room.questions.length > 0 && room.phase === 'lobby';
  const schedule = room.schedule;
  const scheduleBlocksManualStart =
    Boolean(schedule?.enabled && schedule.startsAt) &&
    schedule?.runMode !== 'manual' &&
    Date.now() < (schedule?.startsAt ?? 0);
  const inviteOnly = room.phase !== 'lobby';
  const incompleteCount = room.questions.filter(isQuestionIncomplete).length;
  const canStartTest = room.questions.length > 0 && incompleteCount === 0;

  const handleStartTest = async () => {
    if (!roomId) return;
    setTestBusy('start');
    const returnPath = inviteOnly ? `/host/${roomId}` : `/host/${roomId}/edit`;
    const result = await emitTestSessionStart(socket, roomId, room.joinCode, { returnPath });
    setTestBusy(null);
    if (result.ok) {
      navigate(`/team/${roomId}`);
    }
  };

  const handleEndTest = async () => {
    setTestBusy('end');
    const ok = await emitTestSessionEnd(socket, roomId);
    setTestBusy(null);
    if (ok) {
      clearTeamSession();
    }
  };

  const startQuiz = () => {
    socket.emit(CLIENT_EVENTS.QUIZ_START);
  };

  const endQuizNow = () => {
    if (
      !window.confirm(
        'Avslutte Gruizen for spillerne nå? Gruizmaster kan fortsatt se resultater og administrere etterpå.',
      )
    ) {
      return;
    }
    socket.emit(CLIENT_EVENTS.QUIZ_END);
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
        `Kaste ut «${teamName}»?\n\nSpillerens svar og poeng fjernes hvis Gruizen allerede er i gang.`,
      )
    ) {
      return;
    }
    socket.emit(CLIENT_EVENTS.TEAM_REMOVE, { teamId });
  };

  return (
    <PageShell
      showBrand="compact"
      title={inviteOnly ? 'Invitasjon til spillere' : 'Presenter Gruiz'}
      emoji="🎤"
      wide
      subtitle={
        inviteOnly
          ? 'QR-kode og romkode for spillere som skal bli med'
          : 'Inviter spillere med QR-kode eller romkode — start når alle er klare'
      }
    >
      <HostPhaseIndicator
        active="present"
        links={
          inviteOnly
            ? { live: `/host/${roomId}`, build: `/host/${roomId}/edit` }
            : room.questions.length > 0
              ? { build: `/host/${roomId}/edit`, live: `/host/${roomId}` }
              : { build: `/host/${roomId}/edit` }
        }
      />

      {operationalError && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800 break-words">
          {operationalError}
        </p>
      )}

      <HostReconnectBanner
        visible={hostReconnectNotice && !selfPacedReconnectNotice}
        onDismiss={dismissHostReconnectNotice}
      />
      <HostSelfPacedReconnectBanner
        visible={selfPacedReconnectNotice}
        onDismiss={dismissSelfPacedReconnectNotice}
      />

      <div className="w-full min-w-0 max-w-full space-y-6">
        <LiveQuizClock room={room} />
        {!inviteOnly && <HostScheduleCard room={room} disabled={!connected} />}
        <JoinCodeDisplay joinCode={room.joinCode} joinUrl={joinUrl} />

        {!inviteOnly && (
          <HostTestModeControls
            room={room}
            roomId={roomId}
            canStartTest={canStartTest}
            startDisabledReason={
              incompleteCount > 0
                ? 'Fullfør alle spørsmål i editoren før du prøver Gruizen.'
                : undefined
            }
            starting={testBusy === 'start'}
            ending={testBusy === 'end'}
            onStartTest={() => void handleStartTest()}
            onEndTest={() => void handleEndTest()}
          />
        )}

        {!inviteOnly && (
          <QuizBackupPanel
            questions={room.questions}
            quizTitle={room.joinCode}
            hasUnsavedWork={false}
            exportOnly
            onExported={() => {
              if (!roomId) return;
              markHostDraftExported(roomId, room.questions);
              setExportedHash(quizContentHash(room.questions));
            }}
            onImportQuestions={() => {}}
          />
        )}

        <div className="rounded-2xl border border-quiz-border bg-quiz-surface-elevated/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-quiz-text">Tillat nye spillere</p>
              <p className="mt-1 text-xs text-quiz-muted">
                Reconnect til eksisterende spillere fungerer fortsatt når nye spillere er stengt.
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
              {room.settings.allowNewTeams ? 'Steng for nye spillere' : 'Åpne for nye spillere'}
            </Button>
          </div>
          {!room.settings.allowNewTeams && (
            <p className="mt-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-900">
              Nye spillere er stengt. Spillere som allerede er med kan koble til igjen.
            </p>
          )}
        </div>

        <HostTeamList
          room={room}
          onRemoveTeam={removeTeamFromQuiz}
          emptyHint="Venter på spillere — del QR-koden eller romkoden."
        />

        <div className="w-full min-w-0 space-y-3">
          <Link to={`/host/${roomId}/edit`} className="block w-full">
            <Button type="button" variant="cta" size="lg" className="w-full">
              ✏️ Rediger Gruiz
            </Button>
          </Link>
          {canStart && (
            <Button
              size="lg"
              variant="cta"
              className="w-full text-xl"
              onClick={startQuiz}
              disabled={!connected || scheduleBlocksManualStart}
              title={
                scheduleBlocksManualStart
                  ? 'Gruizen har planlagt start — vent på nedtellingen eller avbryt planen'
                  : undefined
              }
            >
              {scheduleBlocksManualStart ? '⏰ Planlagt start' : '🚀 Start Gruiz'}
            </Button>
          )}
          {inviteOnly && room.phase === 'live' && (
            <Button size="lg" variant="secondary" className="w-full" onClick={endQuizNow}>
              ⛔ Avslutt quiz nå
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
              Ny Gruizmaster-økt
            </button>
          </p>
        </div>
      </div>
      {unexportedDialog}
    </PageShell>
  );
}
