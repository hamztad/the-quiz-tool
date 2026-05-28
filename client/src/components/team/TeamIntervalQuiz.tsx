import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CLIENT_EVENTS,
  isQuestionRevealedToTeam,
  type PublicRoomState,
  type Question,
} from '@quiz-tool/shared';
import { formatOppgaveLabel } from '../../lib/participantCopy';
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
import {
  parseOrderingAnswer,
  serializeOrderingAnswer,
  shuffleOrderingItems,
} from '@quiz-tool/shared';
import { useSocket } from '../../hooks/useSocket';
import { McOptionButtonContent } from '../question/McOptionButtonContent';

const HIGHLIGHT_MS = 5000;

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
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getMyAnswer = (questionId: string) =>
    room.answers.find((a) => a.teamId === teamId && a.questionId === questionId);

  const hasAnswered = (questionId: string) =>
    (room.answeredByTeam[teamId] ?? []).includes(questionId);

  const flashHighlight = useCallback((questionId: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    setHighlightedQuestionId(questionId);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedQuestionId(null);
      highlightTimerRef.current = null;
    }, HIGHLIGHT_MS);
  }, []);

  const openQuestion = useCallback(
    (q: Question) => {
      if ((room.questionStatus[q.id] ?? 'locked') !== 'open') return;
      if (!isQuestionRevealedToTeam(room, q.id)) return;
      setHighlightedQuestionId(null);
      setActiveQuestionId(q.id);
      const ans = room.answers.find((a) => a.teamId === teamId && a.questionId === q.id);
      const storedValue =
        answerDrafts[q.id] ?? (ans?.value && ans.value !== '[hidden]' ? ans.value : '');
      if (q.type === 'ordering' && !storedValue) {
        const shuffled = shuffleOrderingItems(q.orderingItems ?? []);
        const value = serializeOrderingAnswer(shuffled);
        setAnswerText(value);
        setAnswerDrafts((current) => ({ ...current, [q.id]: value }));
        return;
      }
      setAnswerText(storedValue);
    },
    [room, answerDrafts, teamId],
  );

  useEffect(() => {
    if (!onBindQuestionNavigator) return;
    onBindQuestionNavigator((questionId) => {
      const q = room.questions.find((item) => item.id === questionId);
      if (q) openQuestion(q);
    });
    return () => onBindQuestionNavigator(() => {});
  }, [room.questions, onBindQuestionNavigator, openQuestion]);

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

  const activeQuestion = room.questions.find((q) => q.id === activeQuestionId);
  const activeOrderingOrder =
    activeQuestion?.type === 'ordering' ? (parseOrderingAnswer(answerText) ?? []) : [];

  return (
    <div className="space-y-4">
      <LiveQuizClock room={room} />

      <Card className="border-2 border-indigo-200/70 bg-indigo-50/80 p-4 space-y-2">
        <p className="text-sm font-bold text-indigo-950">Intervall-quiz</p>
        <ul className="text-sm text-indigo-950 list-disc pl-5 space-y-1">
          <li>Oppgaver åpnes én om gangen etter tidsplanen — følg med.</li>
          <li>
            <strong>ÅPEN</strong> = du kan svare nå. <strong>STENGT</strong> = vinduet er over.
          </li>
          <li>Slå på varsler nedenfor for beskjed når neste oppgave åpnes.</li>
        </ul>
      </Card>

      {operationalError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800 flex gap-3">
          <p className="flex-1">{operationalError}</p>
          <Button type="button" size="sm" variant="secondary" onClick={onRetryReconnect}>
            Prøv igjen
          </Button>
        </div>
      )}

      {activeQuestion && (room.questionStatus[activeQuestion.id] ?? 'locked') === 'open' ? (
        <Card elevated className="border-2 border-violet-400/50 p-4 min-w-0">
          {room.activeQuestionTimers[activeQuestion.id] && (
            <div className="mb-4">
              <QuestionTimerBar
                endsAt={room.activeQuestionTimers[activeQuestion.id].endsAt}
                openedAt={room.activeQuestionTimers[activeQuestion.id].openedAt}
                serverNow={room.serverNow}
              />
            </div>
          )}
          <Button type="button" variant="secondary" size="sm" className="mb-4" onClick={() => setActiveQuestionId(null)}>
            Til oversikt
          </Button>
          <QuestionBody question={activeQuestion} />
          {activeQuestion.type === 'game' ? (
            <TeamGameView room={room} question={activeQuestion} teamId={teamId} />
          ) : activeQuestion.type === 'open' ? (
            <TextArea className="mt-4" value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="Ditt svar…" />
          ) : activeQuestion.type === 'ordering' ? (
            <SortableOrderingList
              items={activeQuestion.orderingItems ?? []}
              order={activeOrderingOrder}
              onOrderChange={(o) => setAnswerText(serializeOrderingAnswer(o))}
              topLabel={activeQuestion.orderingDirectionTop || 'Øverst'}
              bottomLabel={activeQuestion.orderingDirectionBottom || 'Nederst'}
              dragHandleLabel="Dra"
              getItemContent={(item) => <OrderingChoiceContent item={item} variant="participant" />}
            />
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {activeQuestion.options?.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAnswerText(opt.id)}
                  className={`rounded-2xl border-2 px-3 py-3 text-left ${answerText === opt.id ? 'border-violet-500 bg-violet-50' : 'border-indigo-200'}`}
                >
                  <McOptionButtonContent option={opt} />
                </button>
              ))}
            </div>
          )}
          {activeQuestion.type !== 'game' && (
            <Button variant="cta" className="w-full mt-4" onClick={() => submitAnswer(activeQuestion)} disabled={!answerText.trim()}>
              ✨ Send svar
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {room.questions.map((q, index) => {
            const status = room.questionStatus[q.id] ?? 'locked';
            const revealed = isQuestionRevealedToTeam(room, q.id);
            const canOpen = revealed && status === 'open';
            const myAnswer = getMyAnswer(q.id);

            return (
              <div key={q.id} id={`team-question-${q.id}`}>
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
