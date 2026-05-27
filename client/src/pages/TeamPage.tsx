import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  CLIENT_EVENTS,
  getTeamFinalPlacement,
  isQuestionRevealedToTeam,
  parseOrderingAnswer,
  serializeOrderingAnswer,
  shuffleOrderingItems,
  type Question,
} from '@quiz-tool/shared';
import { Leaderboard } from '../components/leaderboard/Leaderboard';
import { PeerGradingView } from '../components/grading/PeerGradingView';
import { TeamAnswerKeyView } from '../components/team/TeamAnswerKeyView';
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
import { TeamGameView } from '../games/registry';
import { SortableOrderingList } from '../components/ordering/SortableOrderingList';
import { TestModeBanner } from '../components/test/TestModeBanner';

const HIGHLIGHT_MS = 5000;

function WinnerCertificate({
  teamName,
  score,
  lockedAt,
  quizTitle,
}: {
  teamName: string;
  score: number;
  lockedAt?: number;
  quizTitle: string;
}) {
  const dateText = lockedAt
    ? new Intl.DateTimeFormat('nb-NO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(lockedAt))
    : new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium' }).format(new Date());

  return (
    <section className="mb-5 overflow-hidden rounded-3xl border-2 border-yellow-300/60 bg-gradient-to-br from-yellow-300/25 via-quiz-accent/20 to-quiz-surface p-5 text-center shadow-xl sm:p-7">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-200">Vinner av quizen</p>
      <h2 className="mt-3 text-3xl font-black text-quiz-text break-words [overflow-wrap:anywhere] sm:text-4xl">
        {teamName}
      </h2>
      <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3">
        <div className="rounded-2xl border border-yellow-300/40 bg-yellow-300/10 px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-yellow-100">Plassering</p>
          <p className="mt-1 text-2xl font-black text-yellow-100">1. plass</p>
        </div>
        <div className="rounded-2xl border border-quiz-accent/40 bg-quiz-accent/10 px-3 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-quiz-muted">Poeng</p>
          <p className="mt-1 text-2xl font-black text-quiz-accent">{score} p</p>
        </div>
      </div>
      <p className="mt-5 text-sm font-medium text-quiz-text">{quizTitle}</p>
      <p className="mt-1 text-xs text-quiz-muted">{dateText}</p>
      <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-quiz-text">
        Gratulerer! Dette er den offisielle vinnerplakaten etter at quizmaster låste
        sluttresultatet.
      </p>
    </section>
  );
}

function FinalPlacementCard({
  placement,
  score,
}: {
  placement: number;
  score: number;
}) {
  return (
    <Card className="mb-5 border-2 border-green-500/40 bg-green-500/10 p-5 text-center">
      <p className="text-sm font-semibold text-green-200">Endelig plassering</p>
      <p className="mt-2 text-3xl font-black text-quiz-text">{placement}. plass</p>
      <p className="mt-1 text-sm text-quiz-muted">{score} poeng</p>
      <p className="mt-3 text-sm text-quiz-text">
        Sluttresultatet er låst av quizmaster. Takk for innsatsen!
      </p>
    </Card>
  );
}

function ReviewAnswersCta({ to }: { to: string }) {
  return (
    <a
      href={to}
      className="mb-5 block w-full rounded-2xl border-2 border-quiz-accent/50 bg-quiz-accent/10 p-4 text-left transition-colors hover:bg-quiz-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-quiz-accent sm:p-5"
      aria-label="Se egne svar og poeng"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-bold text-quiz-text">Egne svar og poeng er klare</p>
          <p className="mt-1 text-sm text-quiz-muted">
            Se fasit, poeng og send protest på enkeltspørsmål.
          </p>
        </div>
        <span className="box-border inline-flex max-w-full min-w-0 items-center justify-center rounded-xl bg-quiz-accent px-6 py-4 text-center text-lg font-medium text-white transition-colors hover:opacity-90">
          Se egne svar og poeng
        </span>
      </div>
    </a>
  );
}

function AnswerKeyCta({ to }: { to: string }) {
  return (
    <a
      href={to}
      className="mb-5 block w-full rounded-2xl border-2 border-green-500/45 bg-green-500/10 p-4 text-left transition-colors hover:bg-green-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-400 sm:p-5"
      aria-label="Se fasit"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-bold text-quiz-text">Quizmaster har delt fasit</p>
          <p className="mt-1 text-sm text-quiz-muted">
            Se alle spørsmål, riktige svar og maks poeng.
          </p>
        </div>
        <span className="box-border inline-flex max-w-full min-w-0 items-center justify-center rounded-xl bg-green-600 px-6 py-4 text-center text-lg font-medium text-white transition-colors hover:opacity-90">
          Se fasit
        </span>
      </div>
    </a>
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
    sessionRestored,
    retryReconnect,
  } = useRoomGate(roomId, 'team', socket, connected);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const teamId = teamSession?.teamId;
  const showOwnReview = searchParams.get('review') === '1';
  const showAnswerKey = searchParams.get('fasit') === '1';
  const showRestoredMessage = sessionRestored || searchParams.get('restored') === '1';
  const reviewHref = roomId ? `/team/${roomId}?review=1` : '?review=1';
  const answerKeyHref = roomId ? `/team/${roomId}?fasit=1` : '?fasit=1';

  const closeOwnReview = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('review');
      return next;
    });
  };

  useEffect(() => {
    if (!room || !teamId || !activeQuestionId) return;
    const myAnswer = room.answers.find(
      (a) => a.teamId === teamId && a.questionId === activeQuestionId,
    );
    if (myAnswer && myAnswer.value !== '[hidden]') {
      setAnswerText(myAnswer.value);
      setAnswerDrafts((current) => ({ ...current, [activeQuestionId]: myAnswer.value }));
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
      <PageShell title="Deltaker" subtitle="Kunne ikke koble til igjen">
        <div className="py-10 text-center space-y-4 max-w-md mx-auto">
          <p className="text-sm text-quiz-muted leading-relaxed">
            Vi fant ikke deltakerøkten din. Bli med på nytt eller kontakt quizmaster.
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
      <PageShell title="Deltaker" subtitle="Ingen deltakerøkt funnet">
        <div className="py-10 text-center space-y-4 max-w-md mx-auto">
          <p className="text-sm text-quiz-muted leading-relaxed">
            Vi fant ikke deltakerøkten din. Bli med på nytt eller kontakt quizmaster.
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
        title="Deltaker"
        subtitle={connected ? 'Kobler til deltakeren igjen…' : 'Kobler til server…'}
      >
        <div className="py-12 text-center space-y-3 max-w-md mx-auto">
          <p className="text-sm text-quiz-muted leading-relaxed">
            {connected
              ? 'Henter quiz og deltakerdata. Innsendte svar ligger trygt på serveren.'
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
    const trimmed = (answerDrafts[question.id] ?? answerText).trim();
    if (!trimmed) return;

    const existing = getMyAnswer(question.id);
    const event = existing ? CLIENT_EVENTS.ANSWER_UPDATE : CLIENT_EVENTS.ANSWER_SUBMIT;
    socket.emit(event, { questionId: question.id, value: trimmed });
    setAnswerDrafts((current) => {
      const next = { ...current };
      delete next[question.id];
      return next;
    });
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
    const storedValue = answerDrafts[q.id] ?? (ans?.value && ans.value !== '[hidden]' ? ans.value : '');
    if (q.type === 'ordering' && !storedValue) {
      const shuffled = shuffleOrderingItems(q.orderingItems ?? []);
      const value = serializeOrderingAnswer(shuffled);
      setAnswerText(value);
      setAnswerDrafts((current) => ({ ...current, [q.id]: value }));
      return;
    }
    setAnswerText(storedValue);
  };

  const updateActiveAnswer = (value: string) => {
    if (activeQuestionId) {
      setAnswerDrafts((current) => ({ ...current, [activeQuestionId]: value }));
    }
    setAnswerText(value);
  };

  const closeActiveQuestion = () => {
    if (activeQuestionId) {
      flashHighlight(activeQuestionId);
    }
    setActiveQuestionId(null);
  };

  const activeQuestion = room.questions.find((q) => q.id === activeQuestionId);
  const activeQuestionOpen =
    activeQuestion && (room.questionStatus[activeQuestion.id] ?? 'locked') === 'open';
  const activeOrderingOrder =
    activeQuestion?.type === 'ordering' ? (parseOrderingAnswer(answerText) ?? []) : [];

  const canReviewOwn = room.settings.teamReviewOpen === true;
  const canSeeAnswerKey = room.settings.answerKeyOpen === true;
  const finalPlacement = teamId ? getTeamFinalPlacement(room, teamId) : null;
  const finalLockedAt = room.finalLeaderboardSnapshot?.lockedAt;
  const finalResultContent = finalPlacement ? (
    finalPlacement.placement === 1 ? (
      <WinnerCertificate
        teamName={finalPlacement.entry.teamName}
        score={finalPlacement.entry.totalPoints}
        lockedAt={finalLockedAt}
        quizTitle={`Quiz ${room.joinCode}`}
      />
    ) : (
      <FinalPlacementCard
        placement={finalPlacement.placement}
        score={finalPlacement.entry.totalPoints}
      />
    )
  ) : null;

  if (canReviewOwn && showOwnReview && teamId) {
    return (
      <TeamResultsReviewView
        room={room}
        teamId={teamId}
        teamName={myTeam?.name ?? 'Deltaker'}
        onBack={closeOwnReview}
        backLabel={room.phase === 'grading' && assignment ? 'Tilbake til retterunde' : 'Tilbake'}
      />
    );
  }

  if (canSeeAnswerKey && showAnswerKey) {
    return (
      <TeamAnswerKeyView
        room={room}
        teamName={myTeam?.name ?? 'Deltaker'}
        onBack={() => {
          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.delete('fasit');
            return next;
          });
        }}
      />
    );
  }

  if (room.phase === 'post_quiz') {
    return (
      <PageShell title={myTeam?.name ?? 'Deltaker'} subtitle="Quizen er avsluttet">
        {finalResultContent}
        {canSeeAnswerKey && <AnswerKeyCta to={answerKeyHref} />}
        {canReviewOwn && <ReviewAnswersCta to={reviewHref} />}
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
      <PageShell title={myTeam?.name ?? 'Deltaker'} subtitle="Retterunde">
        {canSeeAnswerKey && <AnswerKeyCta to={answerKeyHref} />}
        {canReviewOwn && <ReviewAnswersCta to={reviewHref} />}
        <Card className="p-5 text-center space-y-3">
          <p className="text-lg font-semibold text-quiz-text">Ingen retteroppgave for deg</p>
          <p className="text-sm text-quiz-muted leading-relaxed">
            Retterunde krever minst to deltakere. Quizmaster må ha minst to deltakere og åpne
            spørsmål for at peer-retting skal starte.
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
        teamName={myTeam?.name ?? 'Deltaker'}
        error={operationalError}
        reviewHref={canReviewOwn ? reviewHref : undefined}
        answerKeyHref={canSeeAnswerKey ? answerKeyHref : undefined}
      />
    );
  }

  if (room.phase === 'leaderboard' || room.settings.showLeaderboard) {
    return (
      <PageShell title={myTeam?.name ?? 'Deltaker'} subtitle="Leaderboard">
        {!connected && (
          <div className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
            Kobler til igjen… Dine innsendte svar er lagret på serveren.
          </div>
        )}
        {showRestoredMessage && (
          <div className="mb-4 rounded-xl border border-green-500/35 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-200">
            Du er koblet tilbake til deltakeren din.
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
        {canSeeAnswerKey && <AnswerKeyCta to={answerKeyHref} />}
        {canReviewOwn && <ReviewAnswersCta to={reviewHref} />}
        {finalResultContent}
        <Leaderboard room={room} />
      </PageShell>
    );
  }

  return (
    <PageShell title={myTeam?.name ?? 'Deltaker'} subtitle={`Fase: ${room.phase}`}>
      {room.settings.testMode && roomId && (
        <TestModeBanner hostDashboardHref={`/host/${roomId}`} />
      )}
      {!connected && (
        <div className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          Kobler til igjen… Dine innsendte svar er lagret på serveren.
        </div>
      )}
        {showRestoredMessage && (
          <div className="mb-4 rounded-xl border border-green-500/35 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-200">
            Du er koblet tilbake til deltakeren din.
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
      {canSeeAnswerKey && <AnswerKeyCta to={answerKeyHref} />}
      {canReviewOwn && <ReviewAnswersCta to={reviewHref} />}

      <div className="quiz-page-content space-y-4">
          {activeQuestionOpen ? (
            <Card className="border-2 border-quiz-active p-3 sm:p-4 min-w-0">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-quiz-muted">
                    Åpen oppgave
                  </p>
                  <p className="text-sm font-semibold text-quiz-text break-words">
                    Du kan gå tilbake til oppgavelisten og åpne denne igjen så lenge quizmaster holder den åpen.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={closeActiveQuestion}
                >
                  Til oppgaver
                </Button>
              </div>
              {activeQuestion.game?.gameId !== 'rainbowPuzzle' &&
                activeQuestion.game?.gameId !== 'emojiHunt' &&
                activeQuestion.game?.gameId !== 'dropBall' &&
                activeQuestion.game?.gameId !== 'anagram' && (
                <QuestionBody question={activeQuestion} />
              )}
              {activeQuestion.type === 'game' ? (
                <TeamGameView
                  room={room}
                  question={activeQuestion}
                  teamId={teamId!}
                />
              ) : activeQuestion.type === 'open' ? (
                <TextArea
                  className="mt-4"
                  value={answerText}
                  onChange={(e) => updateActiveAnswer(e.target.value)}
                  placeholder="Ditt svar…"
                />
              ) : activeQuestion.type === 'ordering' ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-quiz-accent/35 bg-quiz-accent/10 px-4 py-3">
                    <p className="text-sm font-bold text-quiz-text">Dra kortene i riktig rekkefølge</p>
                    <p className="mt-1 text-xs text-quiz-muted">
                      {activeQuestion.orderingDirectionTop || 'Øverst'} →{' '}
                      {activeQuestion.orderingDirectionBottom || 'Nederst'}
                    </p>
                  </div>
                  <SortableOrderingList
                    items={activeQuestion.orderingItems ?? []}
                    order={activeOrderingOrder}
                    onOrderChange={(nextOrder) => updateActiveAnswer(serializeOrderingAnswer(nextOrder))}
                    topLabel={activeQuestion.orderingDirectionTop || 'Øverst'}
                    bottomLabel={activeQuestion.orderingDirectionBottom || 'Nederst'}
                    dragHandleLabel="Dra svar"
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-2 min-w-0 max-w-full">
                  {activeQuestion.options?.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateActiveAnswer(opt.id)}
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
              {activeQuestion.type !== 'game' && (
                <Button
                  className="w-full mt-4"
                  onClick={() => submitAnswer(activeQuestion)}
                  disabled={!answerText.trim()}
                >
                  Send svar
                </Button>
              )}
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
                    >
                      {q.type === 'game' &&
                        room.gameResults
                          .filter((result) => result.questionId === q.id)
                          .sort((a, b) => a.rank - b.rank)
                          .map((result) => {
                            const team = room.teams.find((item) => item.id === result.teamId);
                            const isOwn = result.teamId === teamId;
                            return (
                              <div
                                key={`${result.questionId}-${result.teamId}`}
                                className={`mt-2 flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                                  isOwn
                                    ? 'border-green-500/35 bg-green-500/10'
                                    : 'border-quiz-border/70 bg-quiz-surface-elevated/50'
                                }`}
                              >
                                {result.gameId !== 'anagram' && (
                                  <span className="shrink-0 font-bold">#{result.rank}</span>
                                )}
                                <span className="min-w-0 flex-1 break-words">
                                  {team?.name ?? 'Deltaker'}
                                </span>
                                <span className="shrink-0 text-quiz-muted">
                                  {result.displayValue}
                                </span>
                                <span className="shrink-0 font-semibold text-quiz-accent">
                                  {result.quizPoints}p
                                </span>
                              </div>
                            );
                          })}
                    </QuestionCard>
                  </div>
                );
              })}
            </>
          )}
        </div>
    </PageShell>
  );
}
