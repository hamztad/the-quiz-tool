import { useCallback, useEffect, useState } from 'react';
import {
  CLIENT_EVENTS,
  canTeamWorkOnQuestion,
  isProvisionalLeaderboardVisible,
  isTeamQuestionLocked,
  getParticipantMcOptions,
  parseOrderingAnswer,
  serializeOrderingAnswer,
  type PublicRoomState,
  type Question,
} from '@quiz-tool/shared';
import { QuestionBody } from '../question/QuestionBody';
import { QuestionCard } from '../question/QuestionCard';
import { ProvisionalLeaderboardPanel } from './ProvisionalLeaderboardPanel';
import { LiveQuizClock } from '../timing/LiveQuizClock';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TextArea } from '../ui/Input';
import { formatTeamAnswerDisplay } from '../../lib/teamAnswerDisplay';
import { TeamGameView } from '../../games/registry';
import { OrderingChoiceContent } from '../ordering/OrderingChoiceContent';
import { SortableOrderingList } from '../ordering/SortableOrderingList';
import { McOptionButtonContent } from '../question/McOptionButtonContent';
import { useSocket } from '../../hooks/useSocket';
import { teamQuestionListAnchorId } from '../../lib/teamQuestionListNav';
import { useScrollToQuestionOnListReturn } from '../../hooks/useScrollToQuestionOnListReturn';
import { shouldHideParticipantChoiceLabels } from '../../lib/participantChoiceDisplay';
import { getParticipantQuestionViewState } from '../../lib/participantQuestionAccess';
import { prepareParticipantQuestionDraft } from '../../lib/prepareParticipantQuestionDraft';
import { useParticipantQuestionNavigation } from '../../hooks/useParticipantQuestionNavigation';
import { GameCompleteNavigation } from './GameCompleteNavigation';
import { QuestionNavigation } from './QuestionNavigation';
import {
  canParticipantRetryGame,
  countParticipantGameSubmissions,
  hasParticipantGameAttempt,
  useParticipantGameCompleteNav,
} from '../../lib/participantGameComplete';
import { QuestionLockedPlaceholder } from './QuestionLockedPlaceholder';

const PARTICIPANT_ACTIVE_MEDIA_CREDITS = 'deferred' as const;

interface TeamSelfPacedQuizProps {
  room: PublicRoomState;
  teamId: string;
  operationalError: string | null;
  onRetryReconnect: () => void;
  onBindQuestionNavigator?: (navigate: (questionId: string) => void) => void;
}

type SelfPacedView = 'tasks' | 'leaderboard';

export function TeamSelfPacedQuiz({
  room,
  teamId,
  operationalError,
  onRetryReconnect,
  onBindQuestionNavigator,
}: TeamSelfPacedQuizProps) {
  const { socket } = useSocket();
  const [view, setView] = useState<SelfPacedView>('tasks');
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);

  const prepareReturnToQuizList = useScrollToQuestionOnListReturn(
    activeQuestionId,
    setHighlightedQuestionId,
  );

  const locks = room.teamQuestionLocks ?? {};
  const teamsLockedOut = Boolean(room.settings.teamsLockedOut);
  const showLeaderboard = isProvisionalLeaderboardVisible(room.schedule, room.phase, {
    showLeaderboard: room.settings.showLeaderboard,
    finalResultLocked: room.settings.finalResultLocked,
    teamsLockedOut: room.settings.teamsLockedOut,
  });

  const getMyAnswer = (questionId: string) =>
    room.answers.find((a) => a.teamId === teamId && a.questionId === questionId);

  const hasAnswered = (questionId: string) =>
    (room.answeredByTeam[teamId] ?? []).includes(questionId);

  const selectQuestion = useCallback(
    (q: Question) => {
      setHighlightedQuestionId(null);
      const value = prepareParticipantQuestionDraft(q, answerDrafts, getMyAnswer);
      setAnswerText(value);
      if (q.type === 'ordering' && !answerDrafts[q.id]) {
        const existing = getMyAnswer(q.id);
        const hadStored =
          answerDrafts[q.id] ??
          (existing?.value && existing.value !== '[hidden]' ? existing.value : '');
        if (!hadStored) {
          setAnswerDrafts((current) => ({ ...current, [q.id]: value }));
        }
      }
    },
    [answerDrafts, room.answers, teamId],
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
    questions: room.questions,
    activeQuestionId,
    setActiveQuestionId,
    onSelectQuestion: selectQuestion,
  });

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

  const openQuestion = useCallback(
    (q: Question) => {
      if (!canTeamWorkOnQuestion(room.schedule, room.phase, teamsLockedOut, locks, teamId, q)) {
        return;
      }
      selectQuestion(q);
      setActiveQuestionId(q.id);
    },
    [room.schedule, room.phase, teamsLockedOut, locks, teamId, selectQuestion],
  );

  useEffect(() => {
    if (!onBindQuestionNavigator) return;
    onBindQuestionNavigator(navigateToQuestionId);
    return () => {
      onBindQuestionNavigator(() => {});
    };
  }, [onBindQuestionNavigator, navigateToQuestionId]);

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
  const activeQuestionViewState = activeQuestion
    ? getParticipantQuestionViewState(room, teamId, activeQuestion)
    : null;
  const activeOrderingOrder =
    activeQuestion?.type === 'ordering' ? (parseOrderingAnswer(answerText) ?? []) : [];

  const hideChoiceLabels = activeQuestion
    ? shouldHideParticipantChoiceLabels(activeQuestion, hasAnswered(activeQuestion.id))
    : false;

  const showGameCompleteNav = Boolean(
    activeQuestion &&
      activeQuestion.type === 'game' &&
      activeQuestionViewState === 'available' &&
      hasParticipantGameAttempt(room, teamId, activeQuestion),
  );
  const gameCompleteCanRetry =
    showGameCompleteNav && activeQuestion
      ? canParticipantRetryGame(room, teamId, activeQuestion)
      : false;
  const gameCompleteSubmissionCount = activeQuestion
    ? countParticipantGameSubmissions(room, teamId, activeQuestion.id)
    : 0;
  const { visible: gameCompleteNavVisible, dismissForRetry: dismissGameCompleteNav } =
    useParticipantGameCompleteNav(
      activeQuestion?.id,
      gameCompleteSubmissionCount,
      showGameCompleteNav,
    );

  const lockedNonGameCount = room.questions.filter(
    (q) => q.type !== 'game' && isTeamQuestionLocked(locks, teamId, q.id),
  ).length;
  const nonGameCount = room.questions.filter((q) => q.type !== 'game').length;

  if (view === 'leaderboard' && showLeaderboard) {
    return (
      <div className="space-y-4">
        <LiveQuizClock room={room} />
        <ProvisionalLeaderboardPanel room={room} onBack={() => setView('tasks')} />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${gameCompleteNavVisible ? 'pb-28' : ''}`}>
      <LiveQuizClock room={room} />

      {teamsLockedOut && (
        <Card className="border-2 border-violet-300/60 bg-violet-50 p-4">
          <p className="text-sm font-bold text-violet-950">Gruizen er avsluttet</p>
          <p className="mt-1 text-sm text-violet-900">
            Tidsfristen er nådd. Du kan ikke sende flere svar, men du kan se leaderboard og vente
            på endelig resultat fra Gruizmaster.
          </p>
        </Card>
      )}

      <Card className="border-2 border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 to-white p-4 space-y-2">
        <p className="text-sm font-bold text-cyan-950">Selvgående quiz</p>
        <ul className="text-sm text-cyan-950 space-y-1.5 list-disc pl-5">
          <li>
            Alle oppgaver er tilgjengelige med én gang. Trykk på en oppgave for å svare eller spille.
          </li>
          <li>
            <strong>Oppgaver (ikke spill) låses når du sender inn</strong> — da kan du ikke endre svaret.
          </li>
          <li>
            <strong>Spill</strong> kan du spille på nytt fram til Gruizen avsluttes ved tidsfrist.
          </li>
        </ul>
        {nonGameCount > 0 && (
          <p className="text-xs font-semibold text-cyan-800 pt-1">
            Sendt inn: {lockedNonGameCount}/{nonGameCount} oppgaver
            {room.questions.some((q) => q.type === 'game') ? ' · spill teller ikke som låst' : ''}
          </p>
        )}
      </Card>

      {operationalError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="flex-1">{operationalError}</p>
          <Button type="button" size="sm" variant="secondary" onClick={onRetryReconnect}>
            Prøv igjen
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant={view === 'tasks' ? 'cta' : 'secondary'}
          className="flex-1"
          onClick={() => setView('tasks')}
        >
          📋 Oppgaver ({room.questions.length})
        </Button>
        {showLeaderboard && (
          <Button
            type="button"
            variant={view === 'leaderboard' ? 'cta' : 'secondary'}
            className="flex-1"
            onClick={() => setView('leaderboard')}
          >
            🏆 Midlertidig leaderboard
          </Button>
        )}
      </div>

      {activeQuestion ? (
        <>
        <Card elevated className="border-2 border-violet-400/50 p-4 sm:p-5 min-w-0">
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
              <div className="mb-4 min-w-0">
                <p className="text-sm font-semibold text-quiz-text">
                  {activeQuestion.type === 'game'
                    ? 'Spill — du kan prøve igjen til tidsfrist'
                    : 'Send inn for å låse oppgaven'}
                </p>
              </div>
              {activeQuestion.game?.gameId !== 'rainbowPuzzle' &&
                activeQuestion.game?.gameId !== 'emojiHunt' &&
                activeQuestion.game?.gameId !== 'dropBall' &&
                activeQuestion.game?.gameId !== 'anagram' &&
                activeQuestion.game?.gameId !== 'revealImage' && (
                  <QuestionBody
                    question={activeQuestion}
                    mediaCreditsMode={PARTICIPANT_ACTIVE_MEDIA_CREDITS}
                  />
                )}
              {activeQuestion.type === 'game' ? (
                <TeamGameView room={room} question={activeQuestion} teamId={teamId} />
              ) : activeQuestion.type === 'open' ? (
                <TextArea
                  className="mt-4"
                  value={answerText}
                  onChange={(e) => updateActiveAnswer(e.target.value)}
                  placeholder="Ditt svar…"
                />
              ) : activeQuestion.type === 'ordering' ? (
                <div className="mt-4 space-y-3">
                  <SortableOrderingList
                    items={activeQuestion.orderingItems ?? []}
                    order={activeOrderingOrder}
                    onOrderChange={(nextOrder) =>
                      updateActiveAnswer(serializeOrderingAnswer(nextOrder))
                    }
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
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {getParticipantMcOptions(activeQuestion, room.mcDisplayOptionOrder).map(
                    (opt, optIndex) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateActiveAnswer(opt.id)}
                      aria-label={
                        hideChoiceLabels
                          ? `Alternativ ${String.fromCharCode(65 + optIndex)}`
                          : opt.text.trim() || `Alternativ ${String.fromCharCode(65 + optIndex)}`
                      }
                      className={`rounded-2xl border-2 px-3 py-3 text-left min-h-[3.5rem] ${
                        answerText === opt.id
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-indigo-200/80 bg-white'
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
              {activeQuestion.type !== 'game' && !teamsLockedOut && (
                <Button
                  variant="cta"
                  size="lg"
                  className="w-full mt-4"
                  onClick={() => submitAnswer(activeQuestion)}
                  disabled={!answerText.trim()}
                >
                  ✨ Send inn og lås oppgave
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
        {showGameCompleteNav && activeQuestion && (
          <GameCompleteNavigation
            questionNumber={activeIndex + 1}
            totalQuestions={totalQuestions}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            canRetry={gameCompleteCanRetry}
            visible={gameCompleteNavVisible}
            onDismissForRetry={dismissGameCompleteNav}
            onBackToOverview={closeActiveQuestion}
            onPrev={goPrev}
            onNext={goNext}
          />
        )}
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {room.questions.map((q) => {
            const teamLocked = isTeamQuestionLocked(locks, teamId, q.id);
            const answered = hasAnswered(q.id);
            const isGame = q.type === 'game';
            const canOpen =
              !teamsLockedOut &&
              canTeamWorkOnQuestion(room.schedule, room.phase, teamsLockedOut, locks, teamId, q);
            const myAnswer = getMyAnswer(q.id);
            const answerPreview = formatTeamAnswerDisplay(q, myAnswer?.value);
            return (
              <div key={q.id} id={teamQuestionListAnchorId(q.id)}>
                <QuestionCard
                  question={q}
                  status={teamLocked ? 'locked' : 'open'}
                  answered={answered}
                  viewMode="team"
                  teamRevealed
                  teamEditableHint={!teamLocked && !isGame && answered}
                  highlighted={highlightedQuestionId === q.id}
                  teamAnswerPreview={teamLocked || answered ? answerPreview : null}
                  onClick={canOpen ? () => openQuestion(q) : undefined}
                  className={canOpen ? 'cursor-pointer hover:border-violet-300' : 'opacity-90'}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
