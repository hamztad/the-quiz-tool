import type { McOption, MediaCreditsDisplayMode } from '@quiz-tool/shared';
import { ChoiceMediaDisplay } from '../media/ChoiceMediaDisplay';
import { MediaAttribution } from '../media/MediaAttribution';

interface McOptionButtonContentProps {
  option: McOption;
  /** Hide label while participant is answering (image-only mode). */
  hideParticipantLabel?: boolean;
  optionIndex?: number;
  mediaCreditsMode?: MediaCreditsDisplayMode;
}

export function McOptionButtonContent({
  option,
  hideParticipantLabel = false,
  optionIndex = 0,
  mediaCreditsMode = 'full',
}: McOptionButtonContentProps) {
  const showText = !hideParticipantLabel && Boolean(option.text.trim());
  const marker = String.fromCharCode(65 + optionIndex);
  const genericAlt = hideParticipantLabel ? `Alternativ ${marker}` : undefined;
  const spoilerSafe = mediaCreditsMode !== 'full';

  return (
    <span className="flex w-full min-w-0 flex-col items-center gap-2 text-center">
      {option.media && (
        <>
          <ChoiceMediaDisplay
            media={option.media}
            variant="mc-option"
            spoilerSafe={spoilerSafe}
            genericAlt={genericAlt}
          />
          <MediaAttribution media={option.media} mode={mediaCreditsMode} />
        </>
      )}
      {showText && (
        <span className="w-full break-words [overflow-wrap:anywhere] text-base font-semibold quiz-user-text">
          {option.text}
        </span>
      )}
      {!option.media && !showText && (
        <span className="w-full text-base font-semibold text-quiz-muted">—</span>
      )}
    </span>
  );
}
