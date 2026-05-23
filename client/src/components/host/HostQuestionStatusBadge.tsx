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

export function HostQuestionStatusBadge({ status, showHint = false }: HostQuestionStatusBadgeProps) {
  return (
    <div className="flex flex-col items-end gap-1">
      <Badge variant={variantMap[status]}>{hostStatusLabels[status]}</Badge>
      {showHint && (
        <span className="text-[11px] text-quiz-muted text-right max-w-[140px] leading-tight">
          {hostStatusDescriptions[status]}
        </span>
      )}
    </div>
  );
}
