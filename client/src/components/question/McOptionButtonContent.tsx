import type { McOption } from '@quiz-tool/shared';
import { getChoiceItemLabel } from '@quiz-tool/shared';
import { ChoiceMediaDisplay } from '../media/ChoiceMediaDisplay';

export function McOptionButtonContent({ option }: { option: McOption }) {
  const label = getChoiceItemLabel(option);
  const showText = Boolean(option.text.trim());

  return (
    <span className="flex w-full min-w-0 flex-col items-center gap-2 text-center">
      {option.media && <ChoiceMediaDisplay media={option.media} variant="mc-option" />}
      {(showText || !option.media) && (
        <span className="w-full break-words [overflow-wrap:anywhere] text-base font-semibold quiz-user-text">
          {showText ? option.text : label}
        </span>
      )}
    </span>
  );
}
