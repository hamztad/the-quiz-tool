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

  const lockedUnanswered = status === 'locked' && !answered;

  return (
    <Card
      onClick={onClick}
      className={`p-3 sm:p-4 ${active ? 'ring-2 ring-quiz-active' : ''} ${
        highlighted
          ? 'ring-2 ring-green-500/45 border-green-500/50 shadow-[0_0_0_1px_rgba(34,197,94,0.15)]'
          : ''
      } ${lockedUnanswered ? 'opacity-60' : ''} ${className}`}
    >
      <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <span className="text-xs font-medium text-quiz-muted sm:text-sm shrink-0">
          #{question.order + 1}
        </span>
        <div
          className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full min-w-0 sm:w-auto sm:justify-end"
          role="group"
          aria-label="Spørsmålsstatus"
        >
          {hostDisplayStatus && <HostQuestionStatusBadge status={hostDisplayStatus} />}
          {showResponseBadge && <Badge variant={badgeVariant}>{badgeLabel}</Badge>}
          {question.type === 'mc' && <Badge variant="neutral">MC</Badge>}
        </div>
      </div>
      <QuestionBody question={question} />
      {teamAnswerPreview && (
        <div className="mt-3 rounded-xl border border-quiz-border/70 bg-quiz-surface-elevated px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-quiz-muted sm:text-xs">
            Deres svar
          </p>
          <p className="mt-1 text-sm font-medium text-quiz-text break-words">{teamAnswerPreview}</p>
        </div>
      )}
      {children}
    </Card>
  );
}
