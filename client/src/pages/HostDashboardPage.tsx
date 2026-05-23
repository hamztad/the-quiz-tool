import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CLIENT_EVENTS, type Protest, type PublicRoomState } from '@quiz-tool/shared';
import { JoinCodeDisplay } from '../components/host/JoinCodeDisplay';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
import { QuestionCard } from '../components/question/QuestionCard';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useRoomState } from '../hooks/useRoomState';
import { useSocket } from '../hooks/useSocket';
import { getHostSession } from '../lib/tokens';

export function HostDashboardPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, connected } = useSocket();
  const { room, error } = useRoomState(socket);
  const [overridePoints, setOverridePoints] = useState('1');

  useEffect(() => {
    if (!roomId || !connected) return;
    const session = getHostSession(roomId);
    if (session) {
      socket.emit(CLIENT_EVENTS.ROOM_RECONNECT, {
        roomId,
        hostToken: session.hostToken,
      });
    }
  }, [roomId, socket, connected]);

  if (!roomId) return null;

  const joinUrl = `${window.location.origin}/join/${room?.joinCode ?? ''}`;

  const emit = (event: string, payload?: object) => {
    socket.emit(event, payload ?? {});
  };

  const teamAnswered = (teamId: string, questionId: string) =>
    (room?.answeredByTeam[teamId] ?? []).includes(questionId);

  const pendingProtests = room?.protests.filter((p) => p.status === 'pending') ?? [];

  return (
    <PageShell title="Quizmaster" subtitle={room ? `Kode: ${room.joinCode} · Fase: ${room.phase}` : 'Laster…'}>
      {error && <p className="text-red-400 mb-4">{error}</p>}

      {room && (
        <div className="space-y-6">
          <JoinCodeDisplay joinCode={room.joinCode} joinUrl={joinUrl} />

          <div className="flex flex-wrap gap-2">
            <Link to={`/host/${roomId}/edit`}>
              <Button variant="secondary" size="sm">
                Rediger spørsmål
              </Button>
            </Link>
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

          <div className="space-y-3">
            <h2 className="font-semibold">Spørsmål</h2>
            {room.questions.map((q) => {
              const status = room.questionStatus[q.id] ?? 'locked';
              const answeredCount = room.teams.filter((t) => teamAnswered(t.id, q.id)).length;
              return (
                <QuestionCard key={q.id} question={q} status={status} answered={answeredCount > 0}>
                  <p className="text-xs text-quiz-muted mt-3 mb-2">
                    {answeredCount}/{room.teams.length} lag har svart
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {status === 'locked' && (
                      <Button size="sm" onClick={() => emit(CLIENT_EVENTS.QUESTION_OPEN, { questionId: q.id })}>
                        Åpne
                      </Button>
                    )}
                    {status === 'open' && (
                      <>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => emit(CLIENT_EVENTS.QUESTION_LOCK, { questionId: q.id })}
                        >
                          Lås
                        </Button>
                      </>
                    )}
                    {status === 'locked' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => emit(CLIENT_EVENTS.QUESTION_UNLOCK, { questionId: q.id })}
                      >
                        Lås opp
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2 items-center">
                    <Input
                      type="number"
                      className="w-20"
                      value={overridePoints}
                      onChange={(e) => setOverridePoints(e.target.value)}
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
                </QuestionCard>
              );
            })}
            {room.questions.length > 0 && (
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
        </div>
      )}
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
