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
      <div className="flex min-w-0 flex-1 items-start gap-2 overflow-hidden">
        {item.media && (
          <div className="shrink-0 space-y-1">
            <ChoiceMediaDisplay
              media={item.media}
              variant="comparison-row"
              spoilerSafe={spoilerSafe}
            />
            <MediaAttribution media={item.media} mode={creditsMode} className="max-w-[4.5rem]" />
          </div>
        )}
        {showText && (
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{item.text}</span>
        )}
      </div>
    );
  }

  const hasMedia = Boolean(item.media?.url?.trim());

  return (
    <div className="flex min-h-[3.25rem] w-full min-w-0 flex-col justify-center gap-2 overflow-hidden rounded-xl border border-cyan-100/80 bg-white/80 px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
      {hasMedia && (
        <div className="flex w-full min-w-0 shrink-0 flex-col items-center gap-1 sm:w-auto sm:items-start">
          <ChoiceMediaDisplay
            media={item.media!}
            variant="ordering-card"
            spoilerSafe={spoilerSafe}
            genericAlt={genericAlt}
          />
          <MediaAttribution
            media={item.media!}
            mode={mediaCreditsMode}
            className="w-full max-w-[5.5rem] text-center sm:text-left"
          />
        </div>
      )}
      {showText ? (
        <div className="min-w-0 w-full flex-1">
          <span className="block text-base font-bold text-quiz-text break-words [overflow-wrap:anywhere] quiz-user-text">
            {item.text}
          </span>
        </div>
      ) : (
        !hasMedia && (
          <span className="text-sm font-medium text-quiz-muted italic">
            {hideParticipantLabel ? `Element ${itemIndex + 1}` : '—'}
          </span>
        )
      )}
    </div>
  );
}
