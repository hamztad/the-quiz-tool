import type { McOption } from '@quiz-tool/shared';
import { ChoiceMediaDisplay } from '../media/ChoiceMediaDisplay';
import { MediaAttribution } from '../media/MediaAttribution';

export function McOptionButtonContent({ option }: { option: McOption }) {
  const showText = Boolean(option.text.trim());

  return (
    <span className="flex w-full min-w-0 flex-col items-center gap-2 text-center">
      {option.media && (
        <>
          <ChoiceMediaDisplay media={option.media} variant="mc-option" />
          <MediaAttribution media={option.media} />
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
