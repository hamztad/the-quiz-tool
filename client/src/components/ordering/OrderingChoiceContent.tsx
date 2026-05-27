import type { OrderingItem } from '@quiz-tool/shared';
import { getChoiceItemLabel } from '@quiz-tool/shared';
import { ChoiceMediaDisplay } from '../media/ChoiceMediaDisplay';

interface OrderingChoiceContentProps {
  item: OrderingItem;
  variant: 'participant' | 'comparison';
}

export function OrderingChoiceContent({ item, variant }: OrderingChoiceContentProps) {
  const label = getChoiceItemLabel(item);
  const showText = Boolean(item.text.trim());

  if (variant === 'comparison') {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {item.media && <ChoiceMediaDisplay media={item.media} variant="comparison-row" />}
        <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-[3.25rem] flex-1 items-center gap-3 rounded-xl bg-white/80 px-3 py-2 border border-cyan-100/80">
      {item.media && <ChoiceMediaDisplay media={item.media} variant="ordering-card" />}
      <div className="min-w-0 flex-1">
        {showText ? (
          <span className="text-base font-bold text-quiz-text break-words [overflow-wrap:anywhere]">
            {item.text}
          </span>
        ) : (
          <span className="text-sm font-medium text-quiz-muted italic">{label}</span>
        )}
      </div>
    </div>
  );
}
