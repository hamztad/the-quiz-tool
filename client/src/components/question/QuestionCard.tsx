import type { Question, QuestionStatus } from '@quiz-tool/shared';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { HostQuestionStatusBadge } from '../host/HostQuestionStatusBadge';
import type { HostQuestionDisplayStatus } from '../../lib/questionDisplayStatus';
import { hostStatusLabels } from '../../lib/questionDisplayStatus';
import { QuestionBody } from './QuestionBody';

interface QuestionCardProps {
  question: Question;
  status: QuestionStatus;
  answered?: boolean;
  active?: boolean;
  hostDisplayStatus?: HostQuestionDisplayStatus;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function QuestionCard({
  question,
  status,
  answered,
  active,
  hostDisplayStatus,
  onClick,
  className = '',
  children,
}: QuestionCardProps) {
  const badgeVariant =
    status === 'open' ? 'open' : answered ? 'submitted' : 'locked';

  const badgeLabel =
    status === 'open' ? 'Åpent' : answered ? 'Besvart' : 'Låst';

  const hostLabel = hostDisplayStatus ? hostStatusLabels[hostDisplayStatus] : null;
  const showResponseBadge = hostLabel !== badgeLabel;

  return (
    <Card
      onClick={onClick}
      className={`p-3 sm:p-4 ${active ? 'ring-2 ring-quiz-active' : ''} ${status === 'locked' && !answered ? 'opacity-60' : ''} ${className}`}
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
      {children}
    </Card>
  );
}
