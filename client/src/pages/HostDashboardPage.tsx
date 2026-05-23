import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CLIENT_EVENTS, type Protest, type PublicRoomState } from '@quiz-tool/shared';
import { JoinCodeDisplay } from '../components/host/JoinCodeDisplay';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
import { QuestionCard } from '../components/question/QuestionCard';
import { buildParticipantJoinUrl } from '../lib/joinUrls';
import { getHostQuestionDisplayStatus } from '../lib/questionDisplayStatus';
import { isQuestionIncomplete } from '../lib/questionFactory';
import { RoomUnavailableView } from '../components/room/RoomUnavailableView';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useRoomGate } from '../hooks/useRoomGate';
import { useSocket } from '../hooks/useSocket';

export function HostDashboardPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, connected } = useSocket();
  const { room, unavailable, loading, noSession, operationalError } = useRoomGate(
    roomId,
    'host',
    socket,
    connected,
  );
  const [overridePoints, setOverridePoints] = useState('1');

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

  const joinUrl = buildParticipantJoinUrl(room.joinCode);

  const emit = (event: string, payload?: object) => {
    socket.emit(event, payload ?? {});
  };

  const teamAnswered = (teamId: string, questionId: string) =>
    room.answeredByTeam[teamId]?.includes(questionId) ?? false;

  const pendingProtests = room.protests.filter((p) => p.status === 'pending');

  return (
    <PageShell title="Quizmaster" subtitle={`Kode: ${room.joinCode} · Fase: ${room.phase}`}>
      {operationalError && <p className="text-red-400 mb-4">{operationalError}</p>}

      <div className="space-y-6">
          <JoinCodeDisplay joinCode={room.joinCode} joinUrl={joinUrl} />

          <div className="flex flex-wrap gap-2">
            <Link to={`/host/${roomId}/edit`}>
              <Button variant="secondary" size="sm">
                {room.questions.length === 0 ? 'Opprett spørsmål' : 'Rediger spørsmål'}
              </Button>
            </Link>
            {room.phase !== 'ended' && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (window.confirm('Avslutte quizen for alle lag? Dette kan ikke angres.')) {
                    emit(CLIENT_EVENTS.ROOM_CLOSE);
                  }
                }}
              >
                Avslutt quiz
              </Button>
            )}
            {room.phase === 'lobby' && (
              <Button size="sm" onClick={() => emit(CLIENT_EVENTS.QUIZ_START)}>
                Start quiz
              </Button>
            )}
            {room.phase === 'live' && (
              <>
                <Button size="sm" variant="secondary" onClick={() => emit(CLIENT_EVENTS.GRADING_START)}>
                  Start retterunde
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => emit(CLIENT_EVENTS.LEADERBOARD_TOGGLE, { visible: true })}
                >
                  Vis leaderboard
                </Button>
              </>
            )}
            {room.phase === 'grading' && (
              <Button size="sm" onClick={() => emit(CLIENT_EVENTS.GRADING_END)}>
                Avslutt retterunde
              </Button>
            )}
            {room.phase === 'leaderboard' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => emit(CLIENT_EVENTS.LEADERBOARD_TOGGLE, { visible: false })}
              >
                Skjul leaderboard
              </Button>
            )}
          </div>

          {(room.phase === 'leaderboard' || room.settings.showLeaderboard) && (
            <Leaderboard room={room} />
          )}

          <Card>
            <h2 className="font-semibold mb-3">Lag ({room.teams.length})</h2>
            <ul className="space-y-2">
              {room.teams.map((t) => (
                <li key={t.id} className="text-sm flex justify-between">
                  <span>{t.name}</span>
                  <span className="text-quiz-muted">
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

          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">Spørsmål</h2>
                <p className="text-sm text-quiz-muted">
                  {room.questions.length === 0
                    ? 'Opprett spørsmål før du starter'
                    : `${room.questions.length} spørsmål i quizen`}
                </p>
              </div>
              <Link to={`/host/${roomId}/edit`} className="shrink-0 self-start sm:self-center">
                <Button size="sm" variant="ghost">
                  + / Rediger
                </Button>
              </Link>
            </div>

            {room.questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-quiz-border px-6 py-8 text-center">
                <p className="text-quiz-muted text-sm mb-4">Ingen spørsmål lagt til ennå.</p>
                <Link to={`/host/${roomId}/edit`}>
                  <Button>Opprett spørsmål</Button>
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
                        {incomplete && room.phase === 'lobby' && (
                          <p className="text-xs text-slate-300 mt-2 mb-2">
                            Utkast — fullfør i redigeringsvisningen
                          </p>
                        )}
                        {room.phase !== 'lobby' && (
                          <p className="text-xs text-quiz-muted mt-3 mb-2">
                            {answeredCount}/{room.teams.length} lag har svart
                          </p>
                        )}
                        {room.phase === 'live' && (
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                            {runtimeStatus === 'locked' && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  emit(CLIENT_EVENTS.QUESTION_OPEN, { questionId: q.id })
                                }
                              >
                                Åpne for lag
                              </Button>
                            )}
                            {runtimeStatus === 'open' && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() =>
                                  emit(CLIENT_EVENTS.QUESTION_LOCK, { questionId: q.id })
                                }
                              >
                                Lås
                              </Button>
                            )}
                            {runtimeStatus === 'locked' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  emit(CLIENT_EVENTS.QUESTION_UNLOCK, { questionId: q.id })
                                }
                              >
                                Åpne igjen
                              </Button>
                            )}
                          </div>
                        )}
                        {room.phase !== 'lobby' && room.teams.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3">
                            <Input
                              type="number"
                              className="w-20"
                              value={overridePoints}
                              onChange={(e) => setOverridePoints(e.target.value)}
                              aria-label="Poeng overstyring"
                            />
                            {room.teams.map((t) => (
                              <Button
                                key={t.id}
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  emit(CLIENT_EVENTS.SCORE_OVERRIDE, {
                                    teamId: t.id,
                                    questionId: q.id,
                                    points: Number(overridePoints),
                                  })
                                }
                              >
                                {t.name.slice(0, 3)}: {overridePoints}p
                              </Button>
                            ))}
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
    <div className="border-t border-quiz-border pt-3 mt-3 first:border-0 first:pt-0 first:mt-0">
      <p className="text-sm">
        {team?.name} — {question?.lines[0]?.text ?? protest.questionId}
      </p>
      {protest.message && <p className="text-xs text-quiz-muted">{protest.message}</p>}
      <div className="flex gap-2 mt-2">
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
