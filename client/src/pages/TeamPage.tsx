import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CLIENT_EVENTS,
  getTeamFinalPlacement,
  isQuestionRevealedToTeam,
  isIntervalQuiz,
  isSelfPacedQuiz,
  parseOrderingAnswer,
  serializeOrderingAnswer,
  type Question,
} from '@quiz-tool/shared';
import { TeamSelfPacedQuiz } from '../components/team/TeamSelfPacedQuiz';
import { TeamQuestionNotifyLayer } from '../components/team/TeamQuestionNotifyLayer';
import { useQuestionOpenNotifications } from '../hooks/useQuestionOpenNotifications';
import { GruizMark } from '../components/brand/GruizMark';
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
import { OrderingChoiceContent } from '../components/ordering/OrderingChoiceContent';
import { SortableOrderingList } from '../components/ordering/SortableOrderingList';
import { McOptionButtonContent } from '../components/question/McOptionButtonContent';
import { TestModeParticipantBar } from '../components/test/TestModeParticipantBar';
import { emitTestSessionEnd } from '../lib/testSession';
import { clearTestReturnPath, getTestReturnPath } from '../lib/testSessionReturn';
import { clearTeamSession } from '../lib/tokens';
import { LiveQuizClock } from '../components/timing/LiveQuizClock';
import { TeamIntervalQuiz } from '../components/team/TeamIntervalQuiz';
import { QuestionTimerBar } from '../components/timing/QuestionTimerBar';
import { PARTICIPANT_BACK_TO_QUIZ_LABEL, teamQuestionListAnchorId } from '../lib/teamQuestionListNav';
import { useScrollToQuestionOnListReturn } from '../hooks/useScrollToQuestionOnListReturn';
import { getParticipantQuestionViewState } from '../lib/participantQuestionAccess';
import { prepareParticipantQuestionDraft } from '../lib/prepareParticipantQuestionDraft';
import { useParticipantQuestionNavigation } from '../hooks/useParticipantQuestionNavigation';
import { QuestionNavigation } from '../components/team/QuestionNavigation';
import { QuestionLockedPlaceholder } from '../components/team/QuestionLockedPlaceholder';
import { shouldHideParticipantChoiceLabels } from '../lib/participantChoiceDisplay';

const PARTICIPANT_ACTIVE_MEDIA_CREDITS = 'deferred' as const;

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
    <section className="mb-5 overflow-hidden rounded-3xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-100 via-yellow-50 to-violet-100 p-6 text-center shadow-xl sm:p-8 quiz-animate-in">
      <p className="text-4xl" aria-hidden>
        🏆
      </p>
      <div className="mb-3 flex justify-center">
        <GruizMark size="sm" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">Vinner av quizen</p>
      <h2 className="quiz-display mt-3 text-3xl font-bold text-quiz-text break-words [overflow-wrap:anywhere] sm:text-4xl">
        {teamName}
      </h2>
      <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 border-amber-300/60 bg-white/80 px-3 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Plassering</p>
          <p className="mt-1 text-2xl font-black text-amber-900">🥇 1. plass</p>
        </div>
        <div className="rounded-2xl border-2 border-violet-300/50 bg-white/80 px-3 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-violet-800">Poeng</p>
          <p className="mt-1 text-2xl font-black text-violet-700">{score} p</p>
        </div>
      </div>
      <p className="mt-5 text-sm font-semibold text-quiz-text">{quizTitle}</p>
      <p className="mt-1 text-xs text-quiz-muted">{dateText}</p>
      <p className="mt-5 rounded-2xl border border-amber-200/80 bg-white/70 px-4 py-3 text-sm text-quiz-text">
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
    <Card className="mb-5 border-2 border-emerald-300/60 bg-gradient-to-br from-emerald-50 to-teal-50/80 p-5 text-center">
      <p className="text-sm font-bold text-emerald-800">🏁 Endelig plassering</p>
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
            Se fasit, poeng og send protest på enkeltoppgaver.
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
            Se alle oppgaver, riktige svar og maks poeng.
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { socket, connected } = useSocket();
  const [testEnding, setTestEnding] = useState(false);
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

  const prepareReturnToQuizList = useScrollToQuestionOnListReturn(
    activeQuestionId,
    setHighlightedQuestionId,
  );
  const hostedQuestionNavRef = useRef<((questionId: string) => void) | null>(null);
  const selfPacedQuestionNavRef = useRef<((questionId: string) => void) | null>(null);
  const bindSelfPacedQuestionNav = useCallback((navigate: (questionId: string) => void) => {
    selfPacedQuestionNavRef.current = navigate;
  }, []);

  const teamId = teamSession?.teamId;

  const selfPacedLive =
    Boolean(room) &&
    isSelfPacedQuiz(room?.schedule) &&
    room?.phase === 'live';

  const selectQuestion = useCallback(
    (q: Question) => {
      if (!room || !teamId) return;
      setHighlightedQuestionId(null);
      const getAnswer = (questionId: string) =>
        room.answers.find((a) => a.teamId === teamId && a.questionId === questionId);
      const value = prepareParticipantQuestionDraft(q, answerDrafts, getAnswer);
      setAnswerText(value);
      if (q.type === 'ordering' && !answerDrafts[q.id]) {
        const existing = getAnswer(q.id);
        const hadStored =
          answerDrafts[q.id] ??
          (existing?.value && existing.value !== '[hidden]' ? existing.value : '');
        if (!hadStored) {
          setAnswerDrafts((current) => ({ ...current, [q.id]: value }));
        }
      }
    },
    [room, teamId, answerDrafts],
  );

  const {
    activeIndex,
    totalQuestions,
    canGoPrev,
    canGoNext,
    goPrev,
    goNext,
    navigateToQuestionId,
  } = useParticipantQuestionNavigation({
    questions: room?.questions ?? [],
    activeQuestionId,
    setActiveQuestionId,
    onSelectQuestion: selectQuestion,
    enabled: Boolean(room && !selfPacedLive && room.phase === 'live'),
  });

  const questionNotifications = useQuestionOpenNotifications(room, {
    onNavigateToQuestion: (questionId) => {
      if (selfPacedQuestionNavRef.current) {
        selfPacedQuestionNavRef.current(questionId);
        return;
      }
      if (hostedQuestionNavRef.current) {
        hostedQuestionNavRef.current(questionId);
        return;
      }
      document
        .getElementById(teamQuestionListAnchorId(questionId))
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
  });

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

  // Must run before any early returns to keep hook order stable.
  useEffect(() => {
    if (!room || selfPacedLive) {
      hostedQuestionNavRef.current = null;
      return;
    }
    hostedQuestionNavRef.current = navigateToQuestionId;
    return () => {
      hostedQuestionNavRef.current = null;
    };
  }, [room, selfPacedLive, navigateToQuestionId]);

  if (!roomId) return null;

  if (reconnectFailed) {
    return (
      <PageShell showBrand="compact" title="Deltaker" subtitle="Kunne ikke koble til igjen">
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
      <PageShell showBrand="compact" title="Deltaker" subtitle="Ingen deltakerøkt funnet">
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
        showBrand="compact"
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
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800">
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
    prepareReturnToQuizList(question.id);
    setActiveQuestionId(null);
  };

  const openQuestion = (q: Question) => {
    if (!isQuestionRevealedToTeam(room, q.id)) return;
    if ((room.questionStatus[q.id] ?? 'locked') !== 'open') return;
    selectQuestion(q);
    setActiveQuestionId(q.id);
  };

  const updateActiveAnswer = (value: string) => {
    if (activeQuestionId) {
      setAnswerDrafts((current) => ({ ...current, [activeQuestionId]: value }));
    }
    setAnswerText(value);
  };

  const closeActiveQuestion = () => {
    prepareReturnToQuizList(activeQuestionId);
    setActiveQuestionId(null);
  };

  const activeQuestion = room.questions.find((q) => q.id === activeQuestionId);
  const activeQuestionViewState =
    activeQuestion && teamId
      ? getParticipantQuestionViewState(room, teamId, activeQuestion)
      : null;
  const activeOrderingOrder =
    activeQuestion?.type === 'ordering' ? (parseOrderingAnswer(answerText) ?? []) : [];

  const hideChoiceLabels =
    activeQuestion && teamId
      ? shouldHideParticipantChoiceLabels(activeQuestion, hasAnswered(activeQuestion.id))
      : false;

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
        quizTitle={`Gruiz · ${room.joinCode}`}
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
        backLabel={
          room.phase === 'grading' && assignment
            ? 'Tilbake til retterunde'
            : PARTICIPANT_BACK_TO_QUIZ_LABEL
        }
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

  const intervalActive =
    isIntervalQuiz(room.schedule) && teamId && room.phase === 'live';

  const selfPacedActive =
    isSelfPacedQuiz(room.schedule) &&
    teamId &&
    (room.phase === 'live' ||
      (room.phase === 'post_quiz' && !room.settings.finalResultLocked));

  if (intervalActive) {
    return (
      <PageShell showBrand="compact" title={myTeam?.name ?? 'Deltaker'} subtitle="Intervall-quiz">
        <TeamIntervalQuiz
          room={room}
          teamId={teamId}
          operationalError={operationalError}
          onRetryReconnect={retryReconnect}
          onBindQuestionNavigator={bindSelfPacedQuestionNav}
        />
        <TeamQuestionNotifyLayer room={room} notifications={questionNotifications} />
      </PageShell>
    );
  }

  if (selfPacedActive) {
    return (
      <PageShell
        showBrand="compact"
        title={myTeam?.name ?? 'Deltaker'}
        subtitle={room.settings.teamsLockedOut ? 'Selvgående quiz · avsluttet' : 'Selvgående quiz'}
      >
        <TeamSelfPacedQuiz
          room={room}
          teamId={teamId}
          operationalError={operationalError}
          onRetryReconnect={retryReconnect}
          onBindQuestionNavigator={bindSelfPacedQuestionNav}
        />
        <TeamQuestionNotifyLayer room={room} notifications={questionNotifications} />
      </PageShell>
    );
  }

  if (room.phase === 'post_quiz') {
    return (
      <PageShell showBrand="compact" title={myTeam?.name ?? 'Deltaker'} subtitle="Quizen er avsluttet">
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
      <PageShell showBrand="compact" title={myTeam?.name ?? 'Deltaker'} subtitle="Retterunde">
        {canSeeAnswerKey && <AnswerKeyCta to={answerKeyHref} />}
        {canReviewOwn && <ReviewAnswersCta to={reviewHref} />}
        <Card className="p-5 text-center space-y-3">
          <p className="text-lg font-semibold text-quiz-text">Ingen retteroppgave for deg</p>
          <p className="text-sm text-quiz-muted leading-relaxed">
            Retterunde krever minst to deltakere. Quizmaster må ha minst to deltakere og åpne
            oppgaver for at peer-retting skal starte.
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
      <PageShell showBrand="compact" title={myTeam?.name ?? 'Deltaker'} subtitle="Leaderboard">
        {!connected && (
          <div className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-900">
            Kobler til igjen… Dine innsendte svar er lagret på serveren.
          </div>
        )}
        {showRestoredMessage && (
          <div className="mb-4 rounded-xl border border-green-500/35 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-900">
            Du er koblet tilbake til deltakeren din.
          </div>
        )}
        {operationalError && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
    <PageShell showBrand="compact" title={myTeam?.name ?? 'Deltaker'} subtitle={`Fase: ${room.phase}`}>
      {room.settings.testMode && roomId && (
        <TestModeParticipantBar
          editHref={`/host/${roomId}/edit`}
          hostHref={`/host/${roomId}`}
          ending={testEnding}
          onEndTest={() => {
            void (async () => {
              setTestEnding(true);
              const ok = await emitTestSessionEnd(socket, roomId);
              setTestEnding(false);
              if (!ok) return;
              clearTeamSession();
              const returnTo = getTestReturnPath(roomId) ?? `/host/${roomId}/edit`;
              clearTestReturnPath(roomId);
              navigate(returnTo);
            })();
          }}
        />
      )}
      {!connected && (
        <div className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-900">
          Kobler til igjen… Dine innsendte svar er lagret på serveren.
        </div>
      )}
        {showRestoredMessage && (
          <div className="mb-4 rounded-xl border border-green-500/35 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-900">
            Du er koblet tilbake til deltakeren din.
          </div>
        )}
      {operationalError && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0 max-w-full">
          <p className="min-w-0 flex-1 quiz-user-text">{operationalError}</p>
          <Button type="button" size="sm" variant="secondary" onClick={retryReconnect}>
            Prøv igjen
          </Button>
        </div>
      )}
      {canSeeAnswerKey && <AnswerKeyCta to={answerKeyHref} />}
      {canReviewOwn && <ReviewAnswersCta to={reviewHref} />}

      <LiveQuizClock room={room} />

      <TeamQuestionNotifyLayer room={room} notifications={questionNotifications} />

      <div className="quiz-page-content space-y-4">
          {activeQuestion ? (
            <Card elevated className="border-2 border-violet-400/50 ring-2 ring-violet-200/40 p-4 sm:p-5 min-w-0">
              <QuestionNavigation
                questionNumber={activeIndex + 1}
                totalQuestions={totalQuestions}
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                onPrev={goPrev}
                onNext={goNext}
                onBackToOverview={closeActiveQuestion}
              />
              {activeQuestionViewState === 'available' ? (
                <>
                  {room.activeQuestionTimers[activeQuestion.id] && (
                    <div className="mb-4">
                      <QuestionTimerBar
                        endsAt={room.activeQuestionTimers[activeQuestion.id].endsAt}
                        openedAt={room.activeQuestionTimers[activeQuestion.id].openedAt}
                        serverNow={room.serverNow}
                      />
                    </div>
                  )}
                  <p className="mb-4 text-sm text-quiz-muted leading-relaxed">
                    Du kan gå tilbake til oppgavelisten og åpne denne igjen så lenge quizmaster holder den
                    åpen.
                  </p>
                  {activeQuestion.game?.gameId !== 'rainbowPuzzle' &&
                    activeQuestion.game?.gameId !== 'emojiHunt' &&
                    activeQuestion.game?.gameId !== 'dropBall' &&
                    activeQuestion.game?.gameId !== 'anagram' &&
                    activeQuestion.game?.gameId !== 'revealImage' && (
                    <QuestionBody
                      question={activeQuestion}
                      showTypeHeading={false}
                      mediaCreditsMode={PARTICIPANT_ACTIVE_MEDIA_CREDITS}
                    />
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
                      <div className="rounded-2xl border-2 border-cyan-200/70 bg-gradient-to-r from-cyan-50 to-teal-50 px-4 py-3">
                        <p className="text-sm font-bold text-cyan-900">🧩 Dra kortene i riktig rekkefølge</p>
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
                        getItemContent={(item, index) => (
                          <OrderingChoiceContent
                            item={item}
                            variant="participant"
                            hideParticipantLabel={hideChoiceLabels}
                            itemIndex={index}
                            mediaCreditsMode={PARTICIPANT_ACTIVE_MEDIA_CREDITS}
                          />
                        )}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 grid min-w-0 max-w-full grid-cols-1 gap-2 sm:grid-cols-2">
                      {activeQuestion.options?.map((opt, optIndex) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateActiveAnswer(opt.id)}
                          aria-label={
                            hideChoiceLabels
                              ? `Alternativ ${String.fromCharCode(65 + optIndex)}`
                              : opt.text.trim() || `Alternativ ${String.fromCharCode(65 + optIndex)}`
                          }
                          className={`quiz-hover-lift box-border flex w-full min-w-0 max-w-full flex-col items-stretch justify-center rounded-2xl border-2 px-3 py-3 text-left min-h-[3.5rem] transition-all quiz-user-text sm:min-h-[4.75rem] ${
                            answerText === opt.id
                              ? 'border-violet-500 bg-gradient-to-br from-violet-100 to-fuchsia-50 shadow-md ring-2 ring-violet-300/40'
                              : 'border-indigo-200/80 bg-white/95 hover:border-violet-300'
                          }`}
                        >
                          <McOptionButtonContent
                            option={opt}
                            hideParticipantLabel={hideChoiceLabels}
                            optionIndex={optIndex}
                            mediaCreditsMode={PARTICIPANT_ACTIVE_MEDIA_CREDITS}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  {activeQuestion.type !== 'game' && (
                    <Button
                      variant="cta"
                      size="lg"
                      className="w-full mt-4"
                      onClick={() => submitAnswer(activeQuestion)}
                      disabled={!answerText.trim()}
                    >
                      ✨ Send svar
                    </Button>
                  )}
                </>
              ) : (
                <QuestionLockedPlaceholder
                  questionNumber={activeIndex + 1}
                  viewState={activeQuestionViewState ?? 'locked'}
                />
              )}
            </Card>
          ) : (
            <>
              <p className="text-sm text-quiz-muted">
                {room.questions.length} oppgaver i quizen. Trykk på en åpen oppgave for å sende
                svar — eller bla mellom oppgaver med pilene når du er inne i en oppgave.
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
                  <div key={q.id} id={teamQuestionListAnchorId(q.id)} className="min-w-0 max-w-full">
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
