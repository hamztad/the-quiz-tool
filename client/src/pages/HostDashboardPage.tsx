import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CLIENT_EVENTS, type Protest, type PublicRoomState } from '@quiz-tool/shared';
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
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
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
  const [overridePoints, setOverridePoints] = useState('1');

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

  const pendingProtests = room.protests.filter((p) => p.status === 'pending');
  const isPostQuiz = room.phase === 'post_quiz';
  const showLeaderboard = room.phase === 'leaderboard' || room.settings.showLeaderboard;

  const endQuizForTeams = () => {
    if (
      !window.confirm(
        'Avslutte quizen for deltakerne? Du kan fortsatt se resultater, eksportere og redigere etterpå.',
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

  return (
    <PageShell
      title={isPostQuiz ? 'Etter quiz' : 'Kjør quiz'}
      subtitle={`Romkode ${room.joinCode} · ${phaseLabel(room.phase)}`}
    >
      <HostPhaseIndicator active="live" />

      {isPostQuiz && (
        <p className="mb-4 rounded-xl border border-quiz-border bg-quiz-surface/60 px-4 py-3 text-sm text-quiz-muted break-words">
          Quizen er avsluttet for deltakerne. Du kan fortsatt se resultater, eksportere quizen og
          redigere ved behov.
        </p>
      )}

      {operationalError && (
        <p className="text-red-400 mb-4 break-words">{operationalError}</p>
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
            </div>
          )}

          <div className="flex w-full min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link to={`/host/${roomId}/present?invite=1`} className="w-full min-w-0 sm:w-auto">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                Vis invitasjon
              </Button>
            </Link>
            <Link to={`/host/${roomId}/edit`} className="w-full min-w-0 sm:w-auto">
              <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                Rediger quiz
              </Button>
            </Link>
          </div>

          {showLeaderboard && <Leaderboard room={room} />}

          {isPostQuiz && (
            <QuizBackupPanel
              questions={room.questions}
              quizTitle={room.joinCode}
              hasUnsavedWork={false}
              onImportQuestions={() => navigate(`/host/${roomId}/edit?import=1`)}
            />
          )}

          {!isPostQuiz && (
          <>
          <Card className="min-w-0">
            <h2 className="font-semibold mb-3">Lag ({room.teams.length})</h2>
            <ul className="space-y-2">
              {room.teams.map((t) => (
                <li key={t.id} className="flex gap-3 justify-between items-start min-w-0 text-sm">
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] font-medium">
                    {t.name}
                  </span>
                  <span className="shrink-0 text-quiz-muted tabular-nums">
                    {(room.answeredByTeam[t.id] ?? []).length} besvarte
                  </span>
                </li>
              ))}
              {room.teams.length === 0 && (
                <p className="text-quiz-muted text-sm">Venter på lag…</p>
              )}
            </ul>
          </Card>

          {pendingProtests.length > 0 && (
            <Card>
              <h2 className="font-semibold mb-3">Protester</h2>
              {pendingProtests.map((p) => (
                <ProtestRow key={p.id} protest={p} room={room} socket={socket} />
              ))}
            </Card>
          )}

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
                    <div key={q.id}>
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
                        {room.teams.length > 0 && (
                          <div className="flex flex-col gap-3 mt-3 min-w-0 sm:flex-row sm:flex-wrap sm:items-center">
                            <Input
                              type="number"
                              className="w-full max-w-[6rem] shrink-0"
                              value={overridePoints}
                              onChange={(e) => setOverridePoints(e.target.value)}
                              aria-label="Poeng overstyring"
                            />
                            <div className="flex flex-wrap gap-2 min-w-0">
                            {room.teams.map((t) => (
                              <Button
                                key={t.id}
                                size="sm"
                                variant="ghost"
                                className="max-w-full"
                                onClick={() =>
                                  emit(CLIENT_EVENTS.SCORE_OVERRIDE, {
                                    teamId: t.id,
                                    questionId: q.id,
                                    points: Number(overridePoints),
                                  })
                                }
                              >
                                <span className="break-words [overflow-wrap:anywhere]">
                                  {t.name}: {overridePoints}p
                                </span>
                              </Button>
                            ))}
                            </div>
                          </div>
                        )}
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

function ProtestRow({
  protest,
  room,
  socket,
}: {
  protest: Protest;
  room: PublicRoomState;
  socket: ReturnType<typeof useSocket>['socket'];
}) {
  const team = room.teams.find((t) => t.id === protest.teamId);
  const question = room.questions.find((q) => q.id === protest.questionId);

  return (
    <div className="border-t border-quiz-border pt-3 mt-3 first:border-0 first:pt-0 first:mt-0 min-w-0 max-w-full">
      <p className="text-sm break-words [overflow-wrap:anywhere]">
        <span className="font-medium">{team?.name ?? 'Lag'}</span>
        {' — '}
        {question?.lines[0]?.text ?? protest.questionId}
      </p>
      {protest.message && (
        <p className="text-xs text-quiz-muted mt-1 break-words [overflow-wrap:anywhere]">
          {protest.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        <Button
          size="sm"
          onClick={() =>
            socket.emit(CLIENT_EVENTS.PROTEST_RESOLVE, {
              protestId: protest.id,
              approved: true,
              points: question?.maxPoints ?? 1,
            })
          }
        >
          Godkjenn
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() =>
            socket.emit(CLIENT_EVENTS.PROTEST_RESOLVE, {
              protestId: protest.id,
              approved: false,
            })
          }
        >
          Avvis
        </Button>
      </div>
    </div>
  );
}
