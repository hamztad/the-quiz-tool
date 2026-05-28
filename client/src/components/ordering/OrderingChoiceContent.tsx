import type { MediaCreditsDisplayMode, OrderingItem } from '@quiz-tool/shared';
import { ChoiceMediaDisplay } from '../media/ChoiceMediaDisplay';
import { MediaAttribution } from '../media/MediaAttribution';

interface OrderingChoiceContentProps {
  item: OrderingItem;
  variant: 'participant' | 'comparison';
  hideParticipantLabel?: boolean;
  itemIndex?: number;
  mediaCreditsMode?: MediaCreditsDisplayMode;
}

export function OrderingChoiceContent({
  item,
  variant,
  hideParticipantLabel = false,
  itemIndex = 0,
  mediaCreditsMode = 'full',
}: OrderingChoiceContentProps) {
  const showText =
    variant === 'comparison' || (!hideParticipantLabel && Boolean(item.text.trim()));
  const genericAlt =
    hideParticipantLabel && variant === 'participant'
      ? `Element ${itemIndex + 1}`
      : undefined;
  const spoilerSafe = mediaCreditsMode !== 'full';
  const creditsMode =
    variant === 'comparison' && mediaCreditsMode === 'full' ? 'full' : mediaCreditsMode;

  if (variant === 'comparison') {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {item.media && (
          <div className="space-y-1">
            <ChoiceMediaDisplay
              media={item.media}
              variant="comparison-row"
              spoilerSafe={spoilerSafe}
            />
            <MediaAttribution media={item.media} mode={creditsMode} />
          </div>
        )}
        {showText && (
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{item.text}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[3.25rem] flex-1 items-center gap-3 rounded-xl bg-white/80 px-3 py-2 border border-cyan-100/80">
      {item.media && (
        <div className="space-y-1">
          <ChoiceMediaDisplay
            media={item.media}
            variant="ordering-card"
            spoilerSafe={spoilerSafe}
            genericAlt={genericAlt}
          />
          <MediaAttribution media={item.media} mode={mediaCreditsMode} />
        </div>
      )}
      {showText && (
        <div className="min-w-0 flex-1">
          <span className="text-base font-bold text-quiz-text break-words [overflow-wrap:anywhere]">
            {item.text}
          </span>
        </div>
      )}
    </div>
  );
}
