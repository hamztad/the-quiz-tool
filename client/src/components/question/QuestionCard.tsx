import {
  formatOrderingOrder,
  getChoiceItemLabel,
  type ActiveQuestionTimer,
  type Question,
  type QuestionStatus,
} from '@quiz-tool/shared';
import { ChoiceMediaDisplay } from '../media/ChoiceMediaDisplay';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { HostQuestionStatusBadge } from '../host/HostQuestionStatusBadge';
import type { HostQuestionDisplayStatus } from '../../lib/questionDisplayStatus';
import { hostStatusLabels } from '../../lib/questionDisplayStatus';
import { formatOppgaveLabel } from '../../lib/participantCopy';
import { getTeamQuestionBadge } from '../../lib/teamAnswerDisplay';
import { getQuestionTypeTheme } from '../../lib/questionTypeTheme';
import { QuestionBody } from './QuestionBody';
import { QuestionTimerBar } from '../timing/QuestionTimerBar';

interface QuestionCardProps {
  question: Question;
  status: QuestionStatus;
  answered?: boolean;
  active?: boolean;
  highlighted?: boolean;
  hostDisplayStatus?: HostQuestionDisplayStatus;
  teamAnswerPreview?: string | null;
  teamRevealed?: boolean;
  teamEditableHint?: boolean;
  showHostQuestionDetails?: boolean;
  activeQuestionTimer?: ActiveQuestionTimer;
  serverNow?: number;
  viewMode?: 'default' | 'team';
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function QuestionCard({
  question,
  status,
  answered,
  active,
  highlighted = false,
  hostDisplayStatus,
  teamAnswerPreview,
  teamRevealed = true,
  teamEditableHint = false,
  showHostQuestionDetails = false,
  activeQuestionTimer,
  serverNow,
  viewMode = 'default',
  onClick,
  className = '',
  children,
}: QuestionCardProps) {
  const teamBadge =
    viewMode === 'team' ? getTeamQuestionBadge(status, !!answered) : null;

  const defaultBadgeVariant =
    status === 'open' ? 'open' : answered ? 'submitted' : 'locked';
  const defaultBadgeLabel =
    status === 'open' ? 'Åpent' : answered ? 'Besvart' : 'Låst';

  const badgeVariant = teamBadge?.variant ?? defaultBadgeVariant;
  const badgeLabel = teamBadge?.label ?? defaultBadgeLabel;

  const hostLabel = hostDisplayStatus ? hostStatusLabels[hostDisplayStatus] : null;
  const showResponseBadge = hostLabel !== badgeLabel;
  const typeTheme = getQuestionTypeTheme(question);
  const acceptedAnswers = (question.acceptedAnswers ?? []).filter((answer) => answer.trim());

  const lockedUnanswered = status === 'locked' && !answered;
  const teamWaiting = viewMode === 'team' && !teamRevealed;

  return (
    <Card
      onClick={onClick}
      elevated={active || highlighted}
      className={`relative min-w-0 max-w-full overflow-hidden p-4 sm:p-5 ${typeTheme.cardClass} ${
        active ? 'ring-2 ring-violet-500/60 border-violet-400/50' : ''
      } ${
        highlighted ? 'ring-2 ring-emerald-400/60 border-emerald-300/50' : ''
      } ${lockedUnanswered && !teamWaiting ? 'opacity-65' : ''} ${teamWaiting ? 'opacity-90' : ''} ${className}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${typeTheme.accentClass}`}
        aria-hidden
      />
      <div className="flex flex-col gap-2 mb-3 pt-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <span className="text-sm font-bold text-quiz-muted shrink-0">
          {viewMode === 'team' ? formatOppgaveLabel(question.order + 1) : `#${question.order + 1}`}
        </span>
        <div
          className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full min-w-0 sm:w-auto sm:justify-end"
          role="group"
          aria-label="Oppgavestatus"
        >
          {hostDisplayStatus && <HostQuestionStatusBadge status={hostDisplayStatus} />}
          {showResponseBadge && <Badge variant={badgeVariant}>{badgeLabel}</Badge>}
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${typeTheme.badgeClass}`}
          >
            <span aria-hidden>{typeTheme.emoji}</span>
            {typeTheme.label}
          </span>
          {showHostQuestionDetails && (
            <Badge variant="neutral">Maks {question.maxPoints}p</Badge>
          )}
        </div>
      </div>
      {status === 'open' && activeQuestionTimer && (
        <div className="mb-3">
          <QuestionTimerBar
            endsAt={activeQuestionTimer.endsAt}
            openedAt={activeQuestionTimer.openedAt}
            serverNow={serverNow}
            compact={viewMode === 'team'}
          />
        </div>
      )}
      {viewMode === 'team' && teamEditableHint && (
        <p className="text-xs text-quiz-muted mb-3 -mt-1 leading-relaxed">
          Klikk for å endre svaret før oppgaven låses.
        </p>
      )}
      {viewMode === 'team' && !teamRevealed ? (
        <p className="text-sm text-quiz-muted italic leading-relaxed">
          Skjules til quizmaster åpner oppgaven
        </p>
      ) : (
        <QuestionBody question={question} showHint={viewMode !== 'team' || teamRevealed} />
      )}
      {showHostQuestionDetails && question.type === 'mc' && teamRevealed && (
        <div className="mt-3 min-w-0 max-w-full rounded-xl border border-indigo-200/70 bg-white/80 p-3 shadow-sm">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-quiz-muted sm:text-xs">
            Svaralternativer
          </p>
          {question.options && question.options.length > 0 ? (
            <ol className="grid min-w-0 max-w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {question.options.map((option, index) => {
                const marker = String.fromCharCode(65 + index);
                return (
                  <li
                    key={option.id}
                    className={`flex min-w-0 items-start gap-2 rounded-xl border-2 px-3 py-2 text-sm ${
                      option.isCorrect
                        ? 'border-emerald-400/70 bg-emerald-50 text-emerald-900'
                        : 'border-indigo-100 bg-white/90 text-quiz-text'
                    }`}
                  >
                    <span className="shrink-0 font-semibold tabular-nums">{marker}.</span>
                    {option.media && (
                      <ChoiceMediaDisplay media={option.media} variant="comparison-row" />
                    )}
                    <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                      {getChoiceItemLabel(option)}
                    </span>
                    {option.isCorrect && (
                      <span className="shrink-0 rounded-full border border-emerald-400/60 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                        Riktig
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-quiz-muted">Ingen alternativer lagt inn.</p>
          )}
        </div>
      )}
      {showHostQuestionDetails && question.type === 'open' && teamRevealed && (
        <div className="mt-3 min-w-0 max-w-full rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-emerald-800 sm:text-xs">
            Fasit
          </p>
          {acceptedAnswers.length > 0 ? (
            <ul className="flex min-w-0 max-w-full flex-wrap gap-2">
              {acceptedAnswers.map((answer, index) => (
                <li
                  key={`${answer}-${index}`}
                  className="min-w-0 max-w-full rounded-full border border-emerald-300/70 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-900 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                >
                  {answer}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-quiz-muted">Ingen fasit lagt inn.</p>
          )}
        </div>
      )}
      {showHostQuestionDetails && question.type === 'ordering' && teamRevealed && (
        <div className="mt-3 min-w-0 max-w-full rounded-xl border border-cyan-200/80 bg-cyan-50/80 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-cyan-900 sm:text-xs">
            Riktig rekkefølge
          </p>
          <p className="text-sm text-quiz-text quiz-user-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {formatOrderingOrder(question, question.orderingCorrectOrder) || 'Ingen fasit lagt inn.'}
          </p>
          {(question.orderingDirectionTop || question.orderingDirectionBottom) && (
            <p className="mt-2 text-xs font-medium text-quiz-muted">
              {question.orderingDirectionTop || 'Øverst'} → {question.orderingDirectionBottom || 'Nederst'}
            </p>
          )}
        </div>
      )}
      {showHostQuestionDetails && question.type === 'game' && question.game && teamRevealed && (
        <div className="mt-3 min-w-0 max-w-full rounded-xl border border-fuchsia-200/80 bg-fuchsia-50/80 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-fuchsia-900 sm:text-xs">
            🎮 Spilloppsett
          </p>
          <p className="text-sm text-quiz-text">
            {question.game.gameId === 'timerChallenge'
              ? `Stopp klokka: nærmest ${(question.game.targetMs / 1000).toFixed(0)} sekunder vinner.`
              : question.game.gameId === 'rainbowPuzzle'
                ? 'Rainbow Puzzle: høyeste fullførte poengsum vinner.'
                : question.game.gameId === 'emojiHunt'
                  ? `Emoji-jakt: finn ${question.game.targetCount} emoji raskest mulig.`
                  : question.game.gameId === 'dropBall'
                    ? `Drop the Ball: ${question.game.totalRounds} brett med hindre, mynter og lufttidspoeng.`
                  : question.game.gameId === 'anagram'
                    ? `Anagram: ${question.game.scrambledText || 'ikke satt'} · fasit ${question.game.answerText || '—'}`
                    : question.game.gameId === 'mathExpression'
                      ? question.game.mode === 'single'
                        ? `Regnestykke: ${question.game.expression}`
                        : `Regnerace: ${question.game.expressions.length} regnestykker`
                      : question.game.gameId === 'revealImage'
                        ? `Avslør bildet: ${question.game.gridSize}x${question.game.gridSize} ruter · svar ${question.game.correctAnswer || '—'}`
              : 'Innebygd spill'}
          </p>
        </div>
      )}
      {teamRevealed && teamAnswerPreview && (
        <div className="mt-3 rounded-xl border border-violet-200/70 bg-violet-50/60 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-quiz-muted sm:text-xs">
            Deres svar
          </p>
          <p className="mt-1 text-sm font-medium text-quiz-text quiz-user-text">{teamAnswerPreview}</p>
        </div>
      )}
      {children}
    </Card>
  );
}
