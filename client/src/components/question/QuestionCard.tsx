import type { Question, QuestionStatus } from '@quiz-tool/shared';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { QuestionBody } from './QuestionBody';

interface QuestionCardProps {
  question: Question;
  status: QuestionStatus;
  answered?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function QuestionCard({
  question,
  status,
  answered,
  active,
  onClick,
  className = '',
  children,
}: QuestionCardProps) {
  const badgeVariant =
    status === 'open' ? 'open' : answered ? 'submitted' : 'locked';

  const badgeLabel =
    status === 'open' ? 'Åpent' : answered ? 'Besvart' : 'Låst';

  return (
    <Card
      onClick={onClick}
      className={`${active ? 'ring-2 ring-quiz-active' : ''} ${status === 'locked' && !answered ? 'opacity-60' : ''} ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-sm text-quiz-muted">#{question.order + 1}</span>
        <div className="flex gap-2">
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
          {question.type === 'mc' && <Badge variant="neutral">MC</Badge>}
        </div>
      </div>
      <QuestionBody question={question} />
      {children}
    </Card>
  );
}
