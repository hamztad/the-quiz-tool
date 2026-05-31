import { useCallback, useEffect, useState } from 'react';
import {
  CLIENT_EVENTS,
  isQuestionRevealedToTeam,
  getParticipantMcOptions,
  parseOrderingAnswer,
  serializeOrderingAnswer,
  type PublicRoomState,
  type Question,
} from '@quiz-tool/shared';
import { formatOppgaveLabel } from '../../lib/participantCopy';
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
import { QuestionBody } from '../question/QuestionBody';
import { QuestionCard } from '../question/QuestionCard';
import { LiveQuizClock } from '../timing/LiveQuizClock';
import { QuestionTimerBar } from '../timing/QuestionTimerBar';
import { OppgaveIntervalBadge } from './OppgaveIntervalBadge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TextArea } from '../ui/Input';
import { formatTeamAnswerDisplay } from '../../lib/teamAnswerDisplay';
import { TeamGameView } from '../../games/registry';
import { OrderingChoiceContent } from '../ordering/OrderingChoiceContent';
import { SortableOrderingList } from '../ordering/SortableOrderingList';
import { useSocket } from '../../hooks/useSocket';
import { McOptionButtonContent } from '../question/McOptionButtonContent';

interface TeamIntervalQuizProps {
  room: PublicRoomState;
  teamId: string;
  operationalError: string | null;
  onRetryReconnect: () => void;
  onBindQuestionNavigator?: (navigate: (questionId: string) => void) => void;
}

export function TeamIntervalQuiz({
  room,
  teamId,
  operationalError,
  onRetryReconnect,
  onBindQuestionNavigator,
}: TeamIntervalQuizProps) {
  const { socket } = useSocket();
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);

  const prepareReturnToQuizList = useScrollToQuestionOnListReturn(
    activeQuestionId,
    setHighlightedQuestionId,
  );

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

  const openQuestion = useCallback(
    (q: Question) => {
      if ((room.questionStatus[q.id] ?? 'locked') !== 'open') return;
      if (!isQuestionRevealedToTeam(room, q.id)) return;
      selectQuestion(q);
      setActiveQuestionId(q.id);
    },
    [room, selectQuestion],
  );

  useEffect(() => {
    if (!onBindQuestionNavigator) return;
    onBindQuestionNavigator(navigateToQuestionId);
    return () => onBindQuestionNavigator(() => {});
  }, [onBindQuestionNavigator, navigateToQuestionId]);

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

  return (
    <div className={`space-y-4 ${gameCompleteNavVisible ? 'pb-28' : ''}`}>
      <LiveQuizClock room={room} />

      <details className="rounded-lg border border-indigo-200/50 bg-indigo-50/30 text-xs text-indigo-950">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
          <span className="font-semibold">Intervall-quiz</span>
          <span className="shrink-0 text-indigo-600">Info</span>
        </summary>
        <div className="border-t border-indigo-200/40 px-3 pb-2.5 pt-1.5 space-y-1 leading-relaxed text-indigo-900">
          <p>Oppgaver åpnes én om gangen etter tidsplanen.</p>
          <p>
            <strong>ÅPEN</strong> = svar nå. <strong>STENGT</strong> = vinduet er over. Varsler kan slås på
            nedenfor.
          </p>
        </div>
      </details>

      {operationalError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800 flex gap-3">
          <p className="flex-1">{operationalError}</p>
          <Button type="button" size="sm" variant="secondary" onClick={onRetryReconnect}>
            Prøv igjen
          </Button>
        </div>
      )}

      {activeQuestion ? (
        <>
        <Card elevated className="border-2 border-violet-400/50 p-4 min-w-0">
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
              {activeQuestion.game?.gameId !== 'revealImage' && (
                <QuestionBody
                  question={activeQuestion}
                  showTypeHeading={false}
                  mediaCreditsMode={PARTICIPANT_ACTIVE_MEDIA_CREDITS}
                />
              )}
              {activeQuestion.type === 'game' ? (
                <TeamGameView room={room} question={activeQuestion} teamId={teamId} />
              ) : activeQuestion.type === 'open' ? (
                <TextArea
                  className="mt-4"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Ditt svar…"
                />
              ) : activeQuestion.type === 'ordering' ? (
                <SortableOrderingList
                  items={activeQuestion.orderingItems ?? []}
                  order={activeOrderingOrder}
                  onOrderChange={(o) => setAnswerText(serializeOrderingAnswer(o))}
                  topLabel={activeQuestion.orderingDirectionTop || 'Øverst'}
                  bottomLabel={activeQuestion.orderingDirectionBottom || 'Nederst'}
                  dragHandleLabel="Dra"
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
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {getParticipantMcOptions(activeQuestion, room.mcDisplayOptionOrder).map(
                    (opt, optIndex) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnswerText(opt.id)}
                      aria-label={
                        hideChoiceLabels
                          ? `Alternativ ${String.fromCharCode(65 + optIndex)}`
                          : opt.text.trim() || `Alternativ ${String.fromCharCode(65 + optIndex)}`
                      }
                      className={`rounded-2xl border-2 px-3 py-3 text-left ${answerText === opt.id ? 'border-violet-500 bg-violet-50' : 'border-indigo-200'}`}
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
          {room.questions.map((q, index) => {
            const status = room.questionStatus[q.id] ?? 'locked';
            const revealed = isQuestionRevealedToTeam(room, q.id);
            const canOpen = revealed && status === 'open';
            const myAnswer = getMyAnswer(q.id);

            return (
              <div key={q.id} id={teamQuestionListAnchorId(q.id)}>
                <QuestionCard
                  question={q}
                  status={status}
                  answered={hasAnswered(q.id)}
                  viewMode="team"
                  teamRevealed={revealed}
                  highlighted={highlightedQuestionId === q.id}
                  teamAnswerPreview={revealed ? formatTeamAnswerDisplay(q, myAnswer?.value) : null}
                  onClick={canOpen ? () => openQuestion(q) : undefined}
                  className={canOpen ? 'cursor-pointer hover:border-violet-300' : ''}
                >
                  <p className="mt-2 text-xs font-semibold text-quiz-muted flex flex-wrap items-center gap-2">
                    <span>{formatOppgaveLabel(index + 1)}</span>
                    <OppgaveIntervalBadge room={room} questionId={q.id} />
                  </p>
                </QuestionCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
