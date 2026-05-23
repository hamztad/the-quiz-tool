import { Badge } from '../ui/Badge';
import {
  hostStatusDescriptions,
  hostStatusLabels,
  type HostQuestionDisplayStatus,
} from '../../lib/questionDisplayStatus';

const variantMap: Record<HostQuestionDisplayStatus, 'draft' | 'open' | 'locked'> = {
  draft: 'draft',
  active: 'open',
  locked: 'locked',
};

interface HostQuestionStatusBadgeProps {
  status: HostQuestionDisplayStatus;
  showHint?: boolean;
}

export function HostQuestionStatusBadge({
  status,
  showHint = false,
  className = '',
}: HostQuestionStatusBadgeProps & { className?: string }) {
  return (
    <span className={`inline-flex flex-col items-start gap-1 sm:items-end ${className}`}>
      <Badge variant={variantMap[status]}>{hostStatusLabels[status]}</Badge>
      {showHint && (
        <span className="text-[10px] sm:text-[11px] text-quiz-muted leading-tight max-w-full sm:max-w-[140px] sm:text-right">
          {hostStatusDescriptions[status]}
        </span>
      )}
    </span>
  );
}
