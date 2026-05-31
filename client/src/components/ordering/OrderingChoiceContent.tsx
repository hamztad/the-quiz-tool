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
  const showDeferredCredits =
    hasMedia && mediaCreditsMode === 'deferred';

  return (
    <div className="flex min-h-[3rem] w-full min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-xl border border-cyan-100/80 bg-white/80 px-2 py-2 sm:min-h-[3.25rem] sm:gap-3 sm:px-3">
      {hasMedia && (
        <ChoiceMediaDisplay
          media={item.media!}
          variant="ordering-card"
          spoilerSafe={spoilerSafe}
          genericAlt={genericAlt}
          className="!h-12 !w-[4.25rem] !max-w-[38%] !object-contain sm:!h-16 sm:!w-20 sm:!max-w-none"
        />
      )}
      <div className="min-w-0 flex-1">
        {showText && (
          <span className="block text-base font-bold leading-snug text-quiz-text break-words [overflow-wrap:anywhere] quiz-user-text">
            {item.text}
          </span>
        )}
        {showDeferredCredits && (
          <MediaAttribution
            media={item.media!}
            mode="deferred"
            compact
            className={showText ? 'mt-1' : ''}
          />
        )}
        {hasMedia && mediaCreditsMode === 'full' && (
          <MediaAttribution media={item.media!} mode="full" className={showText ? 'mt-1' : ''} />
        )}
        {hasMedia && mediaCreditsMode === 'revealed' && (
          <MediaAttribution
            media={item.media!}
            mode="revealed"
            className={showText ? 'mt-1' : ''}
          />
        )}
        {!hasMedia && !showText && (
          <span className="text-sm font-medium text-quiz-muted italic">
            {hideParticipantLabel ? `Element ${itemIndex + 1}` : '—'}
          </span>
        )}
      </div>
    </div>
  );
}
