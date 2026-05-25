import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  CLIENT_EVENTS,
  isQuestionRevealedToTeam,
  type Question,
} from '@quiz-tool/shared';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
import { PeerGradingView } from '../components/grading/PeerGradingView';
import { TeamResultsReviewView } from '../components/team/TeamResultsReviewView';
import { QuestionBody } from '../components/question/QuestionBody';
import { QuestionCard } from '../components/question/QuestionCard';
import { PageShell } from '../components/layout/PageShell';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TextArea } from '../components/ui/Input';
import { RoomUnavailableView } from '../components/room/RoomUnavailableView';
import { useRoomGate } from '../hooks/useRoomGate';
import { useSocket } from '../hooks/useSocket';
import { formatTeamAnswerDisplay } from '../lib/teamAnswerDisplay';

const HIGHLIGHT_MS = 5000;

function ReviewAnswersCta({ onClick }: { onClick: () => void }) {
  return (
    <Card className="mb-5 border-2 border-quiz-accent/50 bg-quiz-accent/10 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-bold text-quiz-text">Egne svar og poeng er klare</p>
          <p className="mt-1 text-sm text-quiz-muted">
            Se fasit, poeng og send protest på enkeltspørsmål.
          </p>
        </div>
        <Button type="button" size="lg" className="w-full shrink-0 sm:w-auto" onClick={onClick}>
          Se egne svar og poeng
        </Button>
      </div>
    </Card>
  );
}

export function TeamPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { socket, connected } = useSocket();
  const {
    room,
    unavailable,
    reconnecting,
    reconnectFailed,
    noSession,
    operationalError,
    teamSession,
    retryReconnect,
  } = useRoomGate(roomId, 'team', socket, connected);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const teamId = teamSession?.teamId;
  const showOwnReview = searchParams.get('review') === '1';

  const openOwnReview = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('review', '1');
      return next;
    });
  };

  const closeOwnReview = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('review');
      return next;
    });
  };

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
      return;
    }
    if ((room.questionStatus[activeQuestionId] ?? 'locked') !== 'open') {
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

  if (reconnectFailed) {
    return (
      <PageShell title="Lag" subtitle="Kunne ikke koble til igjen">
        <div className="py-10 text-center space-y-4 max-w-md mx-auto">
          <p className="text-sm text-quiz-muted leading-relaxed">
            Lagtilkoblingen på denne enheten er utløpt eller ugyldig. Dine svar ligger fortsatt på
            serveren — be quizmaster om romkoden og bli med på nytt med samme lagnavn.
          </p>
          <Link to="/join">
            <Button size="lg" className="w-full max-w-xs">
              Gå til deltakerportalen
            </Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  if (unavailable) {
    return <RoomUnavailableView reason={unavailable} />;
  }

  if (noSession) {
    return (
      <PageShell title="Lag" subtitle="Ingen lag-session funnet">
        <div className="py-10 text-center space-y-4 max-w-md mx-auto">
          <p className="text-sm text-quiz-muted leading-relaxed">
            Du har ikke blitt med som lag i dette rommet på denne enheten. Skriv inn romkoden på
            deltakerportalen for å bli med.
          </p>
          <Link to="/join">
            <Button size="lg" className="w-full max-w-xs">
              Gå til deltakerportalen
            </Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  if (reconnecting || !room) {
    return (
      <PageShell
        title="Lag"
        subtitle={connected ? 'Kobler til laget igjen…' : 'Kobler til server…'}
      >
        <div className="py-12 text-center space-y-3 max-w-md mx-auto">
          <p className="text-sm text-quiz-muted leading-relaxed">
            {connected
              ? 'Henter quiz og lagdata. Innsendte svar ligger trygt på serveren.'
              : 'Venter på nettverkstilkobling…'}
          </p>
          {operationalError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <p>{operationalError}</p>
              <Button type="button" size="sm" className="mt-3" onClick={retryReconnect}>
                Prøv igjen
              </Button>
            </div>
          )}
        </div>
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
  const activeQuestionOpen =
    activeQuestion && (room.questionStatus[activeQuestion.id] ?? 'locked') === 'open';

  const canReviewOwn = room.settings.teamReviewOpen === true;

  if (canReviewOwn && showOwnReview && teamId) {
    return (
      <TeamResultsReviewView
        room={room}
        teamId={teamId}
        teamName={myTeam?.name ?? 'Lag'}
        onBack={closeOwnReview}
        backLabel={room.phase === 'grading' && assignment ? 'Tilbake til retterunde' : 'Tilbake'}
      />
    );
  }

  if (room.phase === 'post_quiz') {
    return (
      <PageShell title={myTeam?.name ?? 'Lag'} subtitle="Quizen er avsluttet">
        {canReviewOwn && <ReviewAnswersCta onClick={openOwnReview} />}
        <Card className="p-5 text-center space-y-3">
          <p className="text-lg font-semibold text-quiz-text">Quiz avsluttet av quizmaster</p>
          <p className="text-sm text-quiz-muted leading-relaxed">
            Takk for deltakelsen! Resultater og poeng er lagret.
          </p>
        </Card>
        {room.settings.showLeaderboard && (
          <div className="mt-6">
            <Leaderboard room={room} />
          </div>
        )}
      </PageShell>
    );
  }

  if (room.phase === 'grading' && !assignment) {
    return (
      <PageShell title={myTeam?.name ?? 'Lag'} subtitle="Retterunde">
        {canReviewOwn && <ReviewAnswersCta onClick={openOwnReview} />}
        <Card className="p-5 text-center space-y-3">
          <p className="text-lg font-semibold text-quiz-text">Ingen retteroppgave for deg</p>
          <p className="text-sm text-quiz-muted leading-relaxed">
            Retterunde krever minst to lag. Quizmaster må ha minst to lag og åpne spørsmål for at
            peer-retting skal starte.
          </p>
        </Card>
      </PageShell>
    );
  }

  if (room.phase === 'grading' && assignment) {
    return (
      <PeerGradingView
        room={room}
        assignment={assignment}
        graderTeamId={teamId!}
        teamName={myTeam?.name ?? 'Lag'}
        error={operationalError}
        onReviewOwn={canReviewOwn ? openOwnReview : undefined}
      />
    );
  }

  if (room.phase === 'leaderboard' || room.settings.showLeaderboard) {
    return (
      <PageShell title={myTeam?.name ?? 'Lag'} subtitle="Leaderboard">
        {!connected && (
          <div className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
            Kobler til igjen… Dine innsendte svar er lagret på serveren.
          </div>
        )}
        {operationalError && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p>{operationalError}</p>
            <Button type="button" size="sm" variant="secondary" onClick={retryReconnect}>
              Prøv igjen
            </Button>
          </div>
        )}
        {canReviewOwn && <ReviewAnswersCta onClick={openOwnReview} />}
        <Leaderboard room={room} />
      </PageShell>
    );
  }

  return (
    <PageShell title={myTeam?.name ?? 'Lag'} subtitle={`Fase: ${room.phase}`}>
      {!connected && (
        <div className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          Kobler til igjen… Dine innsendte svar er lagret på serveren.
        </div>
      )}
      {operationalError && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0 max-w-full">
          <p className="min-w-0 flex-1 quiz-user-text">{operationalError}</p>
          <Button type="button" size="sm" variant="secondary" onClick={retryReconnect}>
            Prøv igjen
          </Button>
        </div>
      )}

      <div className="quiz-page-content space-y-4">
          {activeQuestionOpen ? (
            <Card className="border-2 border-quiz-active p-3 sm:p-4 min-w-0">
              <QuestionBody question={activeQuestion} />
              {activeQuestion.type === 'open' ? (
                <TextArea
                  className="mt-4"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Ditt svar…"
                />
              ) : (
                <div className="mt-4 space-y-2 min-w-0 max-w-full">
                  {activeQuestion.options?.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnswerText(opt.id)}
                      className={`box-border w-full min-w-0 max-w-full rounded-xl border px-4 py-3 text-left min-h-[44px] transition-colors quiz-user-text ${
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
                Send svar
              </Button>
            </Card>
          ) : (
            <>
              <p className="text-sm text-quiz-muted">
                {room.questions.length} spørsmål i quizen. Trykk på et åpent spørsmål for å sende
                svar — du kommer tilbake til listen automatisk.
              </p>
              {room.questions.map((q) => {
                const status = room.questionStatus[q.id] ?? 'locked';
                const answered = hasAnswered(q.id);
                const revealed = isQuestionRevealedToTeam(room, q.id);
                const myAnswer = getMyAnswer(q.id);
                const answerPreview = revealed
                  ? formatTeamAnswerDisplay(q, myAnswer?.value)
                  : null;
                const canOpen = revealed && status === 'open';

                return (
                  <div key={q.id} id={`team-question-${q.id}`} className="min-w-0 max-w-full">
                    <QuestionCard
                      question={q}
                      status={status}
                      answered={answered}
                      viewMode="team"
                      teamRevealed={revealed}
                      teamEditableHint={answered && status === 'open'}
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
