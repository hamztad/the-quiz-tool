import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CLIENT_EVENTS,
  isQuestionRevealedToTeam,
  type Question,
  type PublicRoomState,
} from '@quiz-tool/shared';
import { AcceptedAnswersList } from '../components/question/AcceptedAnswersList';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
import { QuestionBody } from '../components/question/QuestionBody';
import { QuestionCard } from '../components/question/QuestionCard';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, TextArea } from '../components/ui/Input';
import { RoomUnavailableView } from '../components/room/RoomUnavailableView';
import { useRoomGate } from '../hooks/useRoomGate';
import { useSocket } from '../hooks/useSocket';
import { formatTeamAnswerDisplay } from '../lib/teamAnswerDisplay';

const HIGHLIGHT_MS = 5000;

export function TeamPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, connected } = useSocket();
  const { room, unavailable, loading, noSession, operationalError, teamSession } = useRoomGate(
    roomId,
    'team',
    socket,
    connected,
  );
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [protestMessage, setProtestMessage] = useState('');
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const teamId = teamSession?.teamId;

  useEffect(() => {
    if (!room || !teamId) return;
    const myAnswer = room.answers.find(
      (a) => a.teamId === teamId && a.questionId === activeQuestionId,
    );
    if (myAnswer && myAnswer.value !== '[hidden]') {
      setAnswerText(myAnswer.value);
    }
  }, [activeQuestionId, room, teamId]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const flashHighlight = useCallback((questionId: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedQuestionId(questionId);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedQuestionId(null);
      highlightTimerRef.current = null;
    }, HIGHLIGHT_MS);
  }, []);

  useEffect(() => {
    if (!room || !activeQuestionId) return;
    if (!isQuestionRevealedToTeam(room, activeQuestionId)) {
      setActiveQuestionId(null);
    }
  }, [activeQuestionId, room]);

  useEffect(() => {
    if (!highlightedQuestionId || activeQuestionId) return;
    requestAnimationFrame(() => {
      document
        .getElementById(`team-question-${highlightedQuestionId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [highlightedQuestionId, activeQuestionId]);

  if (!roomId) return null;

  if (unavailable) {
    return <RoomUnavailableView reason={unavailable} />;
  }

  if (noSession) {
    return <RoomUnavailableView reason="not_found" />;
  }

  if (loading || !room) {
    return (
      <PageShell title="Lag" subtitle="Kobler til quizrom…">
        <p className="text-sm text-quiz-muted text-center py-12">Laster…</p>
      </PageShell>
    );
  }

  const myTeam = room.teams.find((t) => t.id === teamId);
  const assignment = room.gradingAssignments.find((a) => a.graderTeamId === teamId);

  const getMyAnswer = (questionId: string) =>
    room.answers.find((a) => a.teamId === teamId && a.questionId === questionId);

  const hasAnswered = (questionId: string) =>
    (room.answeredByTeam[teamId ?? ''] ?? []).includes(questionId);

  const submitAnswer = (question: Question) => {
    const trimmed = answerText.trim();
    if (!trimmed) return;

    const existing = getMyAnswer(question.id);
    const event = existing ? CLIENT_EVENTS.ANSWER_UPDATE : CLIENT_EVENTS.ANSWER_SUBMIT;
    socket.emit(event, { questionId: question.id, value: trimmed });
    setActiveQuestionId(null);
    flashHighlight(question.id);
  };

  const openQuestion = (q: Question) => {
    if (!isQuestionRevealedToTeam(room, q.id)) return;
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedQuestionId(null);
    setActiveQuestionId(q.id);
    const ans = getMyAnswer(q.id);
    setAnswerText(ans?.value && ans.value !== '[hidden]' ? ans.value : '');
  };

  const activeQuestion = room.questions.find((q) => q.id === activeQuestionId);

  if (room.phase === 'grading' && assignment) {
    return (
      <GradingView
        room={room}
        assignment={assignment}
        teamName={myTeam?.name ?? 'Lag'}
        error={operationalError}
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

  if (room.phase === 'leaderboard' || room.settings.showLeaderboard) {
    return (
      <PageShell title={myTeam?.name ?? 'Lag'} subtitle="Leaderboard">
        {operationalError && <p className="text-red-400 mb-4">{operationalError}</p>}
        <Leaderboard room={room} />
      </PageShell>
    );
  }

  return (
    <PageShell title={myTeam?.name ?? 'Lag'} subtitle={`Fase: ${room.phase}`}>
      {operationalError && <p className="text-red-400 mb-4">{operationalError}</p>}

      <div className="space-y-4">
          {activeQuestion ? (
            <Card className="ring-2 ring-quiz-active p-3 sm:p-4">
              <QuestionBody question={activeQuestion} />
              {(() => {
                const qStatus = room.questionStatus[activeQuestion.id] ?? 'locked';
                const isEditable = qStatus === 'open';
                const displayAnswer = formatTeamAnswerDisplay(activeQuestion, answerText);

                if (!isEditable) {
                  return (
                    <>
                      {displayAnswer ? (
                        <div className="mt-4 rounded-xl border border-quiz-border/70 bg-quiz-surface-elevated px-3 py-2.5">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-quiz-muted sm:text-xs">
                            Deres svar
                          </p>
                          <p className="mt-1 text-sm font-medium text-quiz-text break-words">
                            {displayAnswer}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-quiz-muted">Ingen svar sendt inn.</p>
                      )}
                      <p className="mt-3 text-xs text-quiz-muted">
                        Spørsmålet er låst. Svaret kan ikke endres.
                      </p>
                    </>
                  );
                }

                return (
                  <>
                    {activeQuestion.type === 'open' ? (
                      <TextArea
                        className="mt-4"
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Ditt svar…"
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
                          >
                            {opt.text}
                          </button>
                        ))}
                      </div>
                    )}
                    <Button
                      className="w-full mt-4"
                      onClick={() => submitAnswer(activeQuestion)}
                      disabled={!answerText.trim()}
                    >
                      {getMyAnswer(activeQuestion.id) ? 'Oppdater svar' : 'Send inn svar'}
                    </Button>
                  </>
                );
              })()}
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => setActiveQuestionId(null)}
              >
                Tilbake til oversikt
              </Button>
            </Card>
          ) : (
            <>
              <p className="text-sm text-quiz-muted">
                {room.questions.length} spørsmål i quizen. Spørsmålstekst vises når quizmaster
                åpner spørsmålet.
              </p>
              {room.questions.map((q) => {
                const status = room.questionStatus[q.id] ?? 'locked';
                const answered = hasAnswered(q.id);
                const revealed = isQuestionRevealedToTeam(room, q.id);
                const myAnswer = getMyAnswer(q.id);
                const answerPreview = revealed
                  ? formatTeamAnswerDisplay(q, myAnswer?.value)
                  : null;
                const canOpen = revealed && (status === 'open' || answered);

                return (
                  <div key={q.id} id={`team-question-${q.id}`}>
                    <QuestionCard
                      question={q}
                      status={status}
                      answered={answered}
                      viewMode="team"
                      teamRevealed={revealed}
                      highlighted={highlightedQuestionId === q.id}
                      teamAnswerPreview={answerPreview}
                      onClick={canOpen ? () => openQuestion(q) : undefined}
                      className={`${canOpen ? 'cursor-pointer hover:bg-quiz-surface-elevated' : ''} ${
                        !revealed ? 'border-dashed' : ''
                      }`}
                    />
                  </div>
                );
              })}
            </>
          )}
        </div>
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
