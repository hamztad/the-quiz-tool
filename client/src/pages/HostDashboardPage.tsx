import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  canStartPeerGrading,
  CLIENT_EVENTS,
  getOpenQuestionIds,
  type PublicRoomState,
} from '@quiz-tool/shared';
import { QuizBackupPanel } from '../components/host/QuizBackupPanel';
import { HostPhaseIndicator } from '../components/host/HostPhaseIndicator';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
import { QuestionCard } from '../components/question/QuestionCard';
import { getHostQuestionDisplayStatus } from '../lib/questionDisplayStatus';
import { isQuestionIncomplete } from '../lib/questionFactory';
import { isHostPresenting } from '../lib/hostFlow';
import { clearHostSession } from '../lib/tokens';
import {
  getHostQuestionAction,
  hostQuestionActionLabel,
} from '../lib/questionHostControls';
import { RoomUnavailableView } from '../components/room/RoomUnavailableView';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { HostAnswerKeyPanel } from '../components/host/HostAnswerKeyPanel';
import { HostTeamAnswersPanel } from '../components/host/HostTeamAnswersPanel';
import { HostProtestsOverview } from '../components/host/HostProtestsOverview';
import { useRoomGate } from '../hooks/useRoomGate';
import { useSocket } from '../hooks/useSocket';

function phaseLabel(phase: PublicRoomState['phase']): string {
  switch (phase) {
    case 'live':
      return 'Live';
    case 'grading':
      return 'Retterunde';
    case 'leaderboard':
      return 'Leaderboard';
    case 'post_quiz':
      return 'Etter quiz';
    default:
      return phase;
  }
}

function showLeaderboardControls(phase: PublicRoomState['phase']): boolean {
  return phase === 'live' || phase === 'grading' || phase === 'leaderboard' || phase === 'post_quiz';
}

export function HostDashboardPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { room, unavailable, loading, noSession, operationalError } = useRoomGate(
    roomId,
    'host',
    socket,
    connected,
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  useEffect(() => {
    if (!roomId || !room) return;
    if (room.phase === 'lobby') {
      const target = isHostPresenting(roomId)
        ? `/host/${roomId}/present`
        : `/host/${roomId}/edit`;
      navigate(target, { replace: true });
    }
  }, [room, roomId, navigate]);

  if (!roomId) return null;

  if (unavailable) {
    return <RoomUnavailableView reason={unavailable} />;
  }

  if (noSession) {
    return <RoomUnavailableView reason="not_found" />;
  }

  if (loading || !room) {
    return (
      <PageShell title="Quizmaster" subtitle="Kobler til quizrom…">
        <p className="text-sm text-quiz-muted text-center py-12">Laster…</p>
      </PageShell>
    );
  }

  if (room.phase === 'lobby') {
    return (
      <PageShell title="Kjør quiz" subtitle="Kobler til…">
        <p className="text-sm text-quiz-muted text-center py-12">Laster…</p>
      </PageShell>
    );
  }

  const emit = (event: string, payload?: object) => {
    socket.emit(event, payload ?? {});
  };

  const teamAnswered = (teamId: string, questionId: string) =>
    room.answeredByTeam[teamId]?.includes(questionId) ?? false;

  const hasProtests = room.protests.length > 0;
  const isPostQuiz = room.phase === 'post_quiz';
  const teamsSeeLeaderboard = room.phase === 'leaderboard' || room.settings.showLeaderboard;
  const canControlTeamReview =
    room.phase === 'grading' ||
    room.phase === 'leaderboard' ||
    room.phase === 'post_quiz' ||
    (room.phase === 'live' &&
      (room.peerGrades.length > 0 ||
        room.scores.some((s) => s.source === 'peer' || s.source === 'override')));
  const peerGradingCheck = canStartPeerGrading(
    room.teams.length,
    getOpenQuestionIds(room.questions).length,
  );

  const endQuizForTeams = () => {
    if (
      !window.confirm(
        'Avslutte quizen for deltakerne? Du kan fortsatt se resultater, fasit og eksportere etterpå.',
      )
    ) {
      return;
    }
    emit(CLIENT_EVENTS.QUIZ_END);
  };

  const dismissSession = () => {
    if (
      !window.confirm(
        'Lukke quizmaster-økten helt? Rommet forsvinner og deltakere kan ikke koble til igjen.',
      )
    ) {
      return;
    }
    emit(CLIENT_EVENTS.ROOM_CLOSE);
    clearHostSession();
    navigate('/host');
  };

  const removeTeamFromQuiz = (teamId: string, teamName: string) => {
    const gradingNote =
      room.phase === 'grading'
        ? '\n\nUnder retterunde kan dette påvirke hvem som retter hvem.'
        : '';
    if (
      !window.confirm(
        `Kaste ut «${teamName}»?${gradingNote}\n\nLagets svar og poeng fjernes.`,
      )
    ) {
      return;
    }
    emit(CLIENT_EVENTS.TEAM_REMOVE, { teamId });
    if (selectedTeamId === teamId) setSelectedTeamId(null);
  };

  return (
    <PageShell
      title={isPostQuiz ? 'Etter quiz' : 'Kjør quiz'}
      subtitle={`Romkode ${room.joinCode} · ${phaseLabel(room.phase)}`}
    >
      <HostPhaseIndicator
        active="live"
        links={{ present: `/host/${roomId}/present?invite=1` }}
      />

      {isPostQuiz && (
        <p className="mb-4 rounded-xl border border-quiz-border bg-quiz-surface/60 px-4 py-3 text-sm text-quiz-muted break-words">
          Quizen er avsluttet for deltakerne. Du kan fortsatt se resultater, fasit og eksportere
          quizen.
        </p>
      )}

      {operationalError && (
        <p className="text-red-400 mb-4 quiz-user-text">{operationalError}</p>
      )}

      <div className="space-y-6 min-w-0 max-w-full">
          {showLeaderboardControls(room.phase) && (
            <div className="flex w-full min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
              {room.phase === 'leaderboard' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => emit(CLIENT_EVENTS.LEADERBOARD_TOGGLE, { visible: false })}
                >
                  Skjul leaderboard
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => emit(CLIENT_EVENTS.LEADERBOARD_TOGGLE, { visible: true })}
                >
                  Vis leaderboard
                </Button>
              )}
              {room.phase === 'live' && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  disabled={!peerGradingCheck.ok}
                  title={peerGradingCheck.ok ? undefined : peerGradingCheck.message}
                  onClick={() => emit(CLIENT_EVENTS.GRADING_START)}
                >
                  Start retterunde
                </Button>
              )}
              {room.phase === 'grading' && (
                <Button size="sm" className="w-full sm:w-auto" onClick={() => emit(CLIENT_EVENTS.GRADING_END)}>
                  Avslutt retterunde
                </Button>
              )}
              {canControlTeamReview && (
                <Button
                  size="sm"
                  variant={room.settings.teamReviewOpen ? 'secondary' : 'primary'}
                  className="w-full sm:w-auto"
                  onClick={() =>
                    emit(CLIENT_EVENTS.TEAM_REVIEW_TOGGLE, {
                      open: !room.settings.teamReviewOpen,
                    })
                  }
                >
                  {room.settings.teamReviewOpen ? 'Lukk gjennomgang' : 'Åpne gjennomgang for lag'}
                </Button>
              )}
              <Button
                size="sm"
                variant={room.settings.answerKeyOpen ? 'secondary' : 'primary'}
                className="w-full sm:w-auto"
                onClick={() =>
                  emit(CLIENT_EVENTS.ANSWER_KEY_TOGGLE, {
                    open: !room.settings.answerKeyOpen,
                  })
                }
              >
                {room.settings.answerKeyOpen ? 'Skjul fasit for lag' : 'Vis fasit for lag'}
              </Button>
            </div>
          )}

          {room.settings.teamReviewOpen && (
            <p className="rounded-xl border border-green-500/35 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-200">
              Lagene kan nå se egne svar og poeng.
            </p>
          )}

          {room.settings.answerKeyOpen && (
            <p className="rounded-xl border border-green-500/35 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-200">
              Lagene kan nå se fasit.
            </p>
          )}

          <div className="flex w-full min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link to={`/host/${roomId}/present?invite=1`} className="w-full min-w-0 sm:w-auto">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                Vis invitasjon
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setShowAnswerKey(true)}
            >
              Se spørsmål og fasit
            </Button>
          </div>

          <Leaderboard
            room={room}
            hostInteractive
            selectedTeamId={selectedTeamId}
            onSelectTeam={(teamId) =>
              setSelectedTeamId((current) => (current === teamId ? null : teamId))
            }
            onRemoveTeam={removeTeamFromQuiz}
            showAnswerStats={!isPostQuiz}
          />

          {!teamsSeeLeaderboard && room.phase === 'live' && (
            <p className="text-xs text-quiz-muted break-words">
              Deltakerne ser ikke leaderboard ennå — trykk «Vis leaderboard» når du vil vise
              poengstillingen til lagene.
            </p>
          )}

          {showAnswerKey && (
            <HostAnswerKeyPanel room={room} onClose={() => setShowAnswerKey(false)} />
          )}

          {selectedTeamId && (
            <HostTeamAnswersPanel
              room={room}
              teamId={selectedTeamId}
              onClose={() => setSelectedTeamId(null)}
            />
          )}

          {isPostQuiz && (
            <QuizBackupPanel
              questions={room.questions}
              quizTitle={room.joinCode}
              hasUnsavedWork={false}
              exportOnly
              onImportQuestions={() => {}}
            />
          )}

          {hasProtests && (
            <HostProtestsOverview room={room} protests={room.protests} />
          )}

          {!isPostQuiz && (
          <>
          <section className="space-y-4 min-w-0 max-w-full">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Spørsmål</h2>
              <p className="text-sm text-quiz-muted">
                {room.questions.length} spørsmål · åpne, lås og gi poeng underveis
              </p>
            </div>

            {room.questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-quiz-border px-6 py-8 text-center">
                <p className="text-quiz-muted text-sm mb-4">Ingen spørsmål i quizen.</p>
                <Link to={`/host/${roomId}/edit`}>
                  <Button>Legg til spørsmål</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {room.questions.map((q) => {
                  const runtimeStatus = room.questionStatus[q.id] ?? 'locked';
                  const displayStatus = getHostQuestionDisplayStatus(room, q, runtimeStatus);
                  const answeredCount = room.teams.filter((t) => teamAnswered(t.id, q.id)).length;
                  const incomplete = isQuestionIncomplete(q);

                  return (
                    <div key={q.id} className="min-w-0 max-w-full">
                      <QuestionCard
                        question={q}
                        status={runtimeStatus}
                        answered={answeredCount > 0}
                        hostDisplayStatus={displayStatus}
                        className={incomplete ? 'border-dashed border-slate-400/40' : ''}
                      >
                        {incomplete && (
                          <p className="text-xs text-slate-300 mt-2 mb-2">
                            Utkast — fullfør i redigeringsvisningen
                          </p>
                        )}
                        <p className="text-xs text-quiz-muted mt-3 mb-2">
                          {answeredCount}/{room.teams.length} lag har svart
                        </p>
                        {room.phase === 'live' && (() => {
                          const action = getHostQuestionAction(room, q.id);
                          if (!action) return null;
                          const onClick = () => {
                            if (action === 'open') {
                              emit(CLIENT_EVENTS.QUESTION_OPEN, { questionId: q.id });
                            } else if (action === 'lock') {
                              emit(CLIENT_EVENTS.QUESTION_LOCK, { questionId: q.id });
                            } else {
                              emit(CLIENT_EVENTS.QUESTION_UNLOCK, { questionId: q.id });
                            }
                          };
                          return (
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                              <Button
                                size="sm"
                                variant={action === 'lock' ? 'secondary' : 'primary'}
                                onClick={onClick}
                              >
                                {hostQuestionActionLabel(action)}
                              </Button>
                            </div>
                          );
                        })()}
                      </QuestionCard>
                    </div>
                  );
                })}
                {room.phase === 'live' && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() =>
                      emit(CLIENT_EVENTS.ROUND_LOCK, {
                        questionIds: room.questions.map((q) => q.id),
                      })
                    }
                  >
                    Lås alle spørsmål
                  </Button>
                )}
              </div>
            )}
          </section>
          </>
          )}

          <div className="pt-6 mt-2 border-t border-quiz-border/50 space-y-2">
            {!isPostQuiz && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto text-quiz-muted"
                onClick={endQuizForTeams}
              >
                Avslutt quiz
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto text-quiz-muted"
              onClick={dismissSession}
            >
              Lukk økt
            </Button>
          </div>
        </div>
    </PageShell>
  );
}
