import type { Question, QuestionStatus } from '@quiz-tool/shared';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { HostQuestionStatusBadge } from '../host/HostQuestionStatusBadge';
import type { HostQuestionDisplayStatus } from '../../lib/questionDisplayStatus';
import { hostStatusLabels } from '../../lib/questionDisplayStatus';
import { getTeamQuestionBadge } from '../../lib/teamAnswerDisplay';
import { QuestionBody } from './QuestionBody';

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
  const questionTypeLabel = question.type === 'mc' ? 'Flervalg' : 'Åpent svar';
  const acceptedAnswers = (question.acceptedAnswers ?? []).filter((answer) => answer.trim());

  const lockedUnanswered = status === 'locked' && !answered;
  const teamWaiting = viewMode === 'team' && !teamRevealed;

  return (
    <Card
      onClick={onClick}
      className={`min-w-0 max-w-full overflow-hidden p-3 sm:p-4 ${
        active ? 'border-quiz-active border-2' : ''
      } ${
        highlighted ? 'border-2 border-green-500/50 bg-green-500/5' : ''
      } ${lockedUnanswered && !teamWaiting ? 'opacity-60' : ''} ${teamWaiting ? 'opacity-90' : ''} ${className}`}
    >
      <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <span className="text-xs font-medium text-quiz-muted sm:text-sm shrink-0">
          {viewMode === 'team' ? `Spørsmål ${question.order + 1}` : `#${question.order + 1}`}
        </span>
        <div
          className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full min-w-0 sm:w-auto sm:justify-end"
          role="group"
          aria-label="Spørsmålsstatus"
        >
          {hostDisplayStatus && <HostQuestionStatusBadge status={hostDisplayStatus} />}
          {showResponseBadge && <Badge variant={badgeVariant}>{badgeLabel}</Badge>}
          {showHostQuestionDetails ? (
            <>
              <Badge variant={question.type === 'mc' ? 'active' : 'neutral'}>
                {questionTypeLabel}
              </Badge>
              <Badge variant="neutral">Maks {question.maxPoints}p</Badge>
            </>
          ) : (
            question.type === 'mc' && <Badge variant="neutral">MC</Badge>
          )}
        </div>
      </div>
      {viewMode === 'team' && teamEditableHint && (
        <p className="text-xs text-quiz-muted mb-3 -mt-1 leading-relaxed">
          Klikk for å endre svaret før spørsmålet låses.
        </p>
      )}
      {viewMode === 'team' && !teamRevealed ? (
        <p className="text-sm text-quiz-muted italic leading-relaxed">
          Skjules til quizmaster åpner spørsmålet
        </p>
      ) : (
        <QuestionBody question={question} showHint={viewMode !== 'team' || teamRevealed} />
      )}
      {showHostQuestionDetails && question.type === 'mc' && teamRevealed && (
        <div className="mt-3 min-w-0 max-w-full rounded-xl border border-quiz-border/70 bg-quiz-surface-elevated/50 p-3">
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
                    className={`flex min-w-0 items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                      option.isCorrect
                        ? 'border-green-500/45 bg-green-500/10 text-green-100'
                        : 'border-quiz-border/70 bg-quiz-bg/35 text-quiz-text'
                    }`}
                  >
                    <span className="shrink-0 font-semibold tabular-nums">{marker}.</span>
                    <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                      {option.text}
                    </span>
                    {option.isCorrect && (
                      <span className="shrink-0 rounded-full border border-green-500/40 bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-200">
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
        <div className="mt-3 min-w-0 max-w-full rounded-xl border border-green-500/25 bg-green-500/5 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-green-300 sm:text-xs">
            Fasit
          </p>
          {acceptedAnswers.length > 0 ? (
            <ul className="flex min-w-0 max-w-full flex-wrap gap-2">
              {acceptedAnswers.map((answer, index) => (
                <li
                  key={`${answer}-${index}`}
                  className="min-w-0 max-w-full rounded-full border border-green-500/35 bg-green-500/10 px-3 py-1.5 text-sm font-medium text-green-100 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
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
      {teamRevealed && teamAnswerPreview && (
        <div className="mt-3 rounded-xl border border-quiz-border/70 bg-quiz-surface-elevated px-3 py-2.5">
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
