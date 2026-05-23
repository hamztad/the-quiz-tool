import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CLIENT_EVENTS, type Question, type PublicRoomState } from '@quiz-tool/shared';
import { AcceptedAnswersList } from '../components/question/AcceptedAnswersList';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
import { QuestionBody } from '../components/question/QuestionBody';
import { QuestionCard } from '../components/question/QuestionCard';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, TextArea } from '../components/ui/Input';
import { useRoomState } from '../hooks/useRoomState';
import { useSocket } from '../hooks/useSocket';
import { getTeamSession } from '../lib/tokens';

export function TeamPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, connected } = useSocket();
  const { room, error } = useRoomState(socket);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [protestMessage, setProtestMessage] = useState('');

  const teamSession = roomId ? getTeamSession(roomId) : null;
  const teamId = teamSession?.teamId;

  useEffect(() => {
    if (!roomId || !connected || !teamSession) return;
    socket.emit(CLIENT_EVENTS.ROOM_RECONNECT, {
      roomId,
      teamToken: teamSession.teamToken,
    });
  }, [roomId, socket, connected, teamSession]);

  useEffect(() => {
    if (!room || !teamId) return;
    const myAnswer = room.answers.find(
      (a) => a.teamId === teamId && a.questionId === activeQuestionId,
    );
    if (myAnswer && myAnswer.value !== '[hidden]') {
      setAnswerText(myAnswer.value);
    }
  }, [activeQuestionId, room, teamId]);

  if (!roomId || !teamSession) {
    return (
      <PageShell title="Lag">
        <p className="text-quiz-muted">Ingen lag-session. Gå til /join for å bli med.</p>
      </PageShell>
    );
  }

  const myTeam = room?.teams.find((t) => t.id === teamId);
  const assignment = room?.gradingAssignments.find((a) => a.graderTeamId === teamId);

  const getMyAnswer = (questionId: string) =>
    room?.answers.find((a) => a.teamId === teamId && a.questionId === questionId);

  const hasAnswered = (questionId: string) =>
    (room?.answeredByTeam[teamId ?? ''] ?? []).includes(questionId);

  const submitAnswer = (question: Question) => {
    const existing = getMyAnswer(question.id);
    const event = existing ? CLIENT_EVENTS.ANSWER_UPDATE : CLIENT_EVENTS.ANSWER_SUBMIT;
    const value =
      question.type === 'mc'
        ? answerText
        : answerText;
    socket.emit(event, { questionId: question.id, value });
  };

  const activeQuestion = room?.questions.find((q) => q.id === activeQuestionId);

  if (room?.phase === 'grading' && assignment) {
    return (
      <GradingView
        room={room}
        assignment={assignment}
        teamName={myTeam?.name ?? 'Lag'}
        error={error}
        onProtest={(questionId) => {
          socket.emit(CLIENT_EVENTS.PROTEST_SUBMIT, {
            questionId,
            message: protestMessage || undefined,
          });
          setProtestMessage('');
        }}
        protestMessage={protestMessage}
        setProtestMessage={setProtestMessage}
      />
    );
  }

  if (room?.phase === 'leaderboard' || room?.settings.showLeaderboard) {
    return (
      <PageShell title={myTeam?.name ?? 'Lag'} subtitle="Leaderboard">
        {error && <p className="text-red-400 mb-4">{error}</p>}
        {room && <Leaderboard room={room} />}
      </PageShell>
    );
  }

  return (
    <PageShell title={myTeam?.name ?? 'Lag'} subtitle={`Fase: ${room?.phase ?? '…'}`}>
      {error && <p className="text-red-400 mb-4">{error}</p>}

      {room && (
        <div className="space-y-4">
          {activeQuestion ? (
            <Card className="ring-2 ring-quiz-active">
              <QuestionBody question={activeQuestion} />
              {activeQuestion.type === 'open' ? (
                <TextArea
                  className="mt-4"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Ditt svar…"
                  disabled={room.questionStatus[activeQuestion.id] !== 'open'}
                />
              ) : (
                <div className="mt-4 space-y-2">
                  {activeQuestion.options?.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnswerText(opt.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left min-h-[44px] transition-colors ${
                        answerText === opt.id
                          ? 'border-quiz-accent bg-quiz-accent/20'
                          : 'border-quiz-border bg-quiz-surface-elevated'
                      }`}
                      disabled={room.questionStatus[activeQuestion.id] !== 'open'}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}
              {room.questionStatus[activeQuestion.id] === 'open' && (
                <Button className="w-full mt-4" onClick={() => submitAnswer(activeQuestion)}>
                  {getMyAnswer(activeQuestion.id) ? 'Oppdater svar' : 'Send inn svar'}
                </Button>
              )}
              <Button variant="ghost" className="w-full mt-2" onClick={() => setActiveQuestionId(null)}>
                Tilbake til oversikt
              </Button>
            </Card>
          ) : (
            <>
              <p className="text-sm text-quiz-muted">Trykk på et spørsmål for å svare eller redigere.</p>
              {room.questions.map((q) => {
                const status = room.questionStatus[q.id] ?? 'locked';
                const answered = hasAnswered(q.id);
                return (
                  <Fragment key={q.id}>
                    <QuestionCard
                      question={q}
                      status={status}
                      answered={answered}
                      onClick={() => {
                        if (status === 'open' || answered) {
                          setActiveQuestionId(q.id);
                          const ans = getMyAnswer(q.id);
                          setAnswerText(ans?.value && ans.value !== '[hidden]' ? ans.value : '');
                        }
                      }}
                    />
                  </Fragment>
                );
              })}
            </>
          )}
        </div>
      )}
    </PageShell>
  );
}

function GradingQuestionCard({
  question: q,
  room,
  assignment,
  protestMessage,
  setProtestMessage,
  onProtest,
}: {
  question: Question;
  room: PublicRoomState;
  assignment: { targetTeamId: string; questionIds: string[] };
  protestMessage: string;
  setProtestMessage: (v: string) => void;
  onProtest: (questionId: string) => void;
}) {
  const { socket } = useSocket();
  const [points, setPoints] = useState(String(q.maxPoints));
  const targetAnswer = room.answers.find(
    (a) => a.teamId === assignment.targetTeamId && a.questionId === q.id,
  );

  return (
    <Card className="space-y-3">
      <QuestionBody question={q} />
      <AcceptedAnswersList answers={q.acceptedAnswers ?? []} />
      <div className="rounded-xl bg-quiz-surface-elevated p-3">
        <p className="text-xs text-quiz-muted mb-1">Lagets svar</p>
        <p className="font-medium">{targetAnswer?.value ?? '—'}</p>
      </div>
      <div className="flex gap-2 items-center">
        <Input
          type="number"
          min={0}
          max={q.maxPoints}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          className="w-24"
        />
        <Button
          onClick={() =>
            socket.emit(CLIENT_EVENTS.PEER_GRADE_SUBMIT, {
              targetTeamId: assignment.targetTeamId,
              questionId: q.id,
              points: Number(points),
            })
          }
        >
          Gi poeng
        </Button>
      </div>
      <TextArea
        placeholder="Protest? (valgfritt melding)"
        value={protestMessage}
        onChange={(e) => setProtestMessage(e.target.value)}
        rows={2}
      />
      <Button variant="ghost" size="sm" onClick={() => onProtest(q.id)}>
        Send protest
      </Button>
    </Card>
  );
}

function GradingView({
  room,
  assignment,
  teamName,
  error,
  onProtest,
  protestMessage,
  setProtestMessage,
}: {
  room: PublicRoomState;
  assignment: { targetTeamId: string; questionIds: string[] };
  teamName: string;
  error: string | null;
  onProtest: (questionId: string) => void;
  protestMessage: string;
  setProtestMessage: (v: string) => void;
}) {
  const targetTeam = room.teams.find((t) => t.id === assignment.targetTeamId);
  const openQuestions = room.questions.filter(
    (q) => q.type === 'open' && assignment.questionIds.includes(q.id),
  );

  return (
    <PageShell title={teamName} subtitle={`Retter: ${targetTeam?.name ?? '…'}`}>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      <p className="text-sm text-quiz-muted mb-4">
        Gi poeng basert på godkjente svar. MC rettes automatisk og vises ikke her.
      </p>

      {openQuestions.map((q) => (
        <Fragment key={q.id}>
          <GradingQuestionCard
            question={q}
            room={room}
            assignment={assignment}
            protestMessage={protestMessage}
            setProtestMessage={setProtestMessage}
            onProtest={onProtest}
          />
        </Fragment>
      ))}
    </PageShell>
  );
}
