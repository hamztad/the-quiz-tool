import type { MediaAttachment } from '@quiz-tool/shared';
import { getGameplayImageAlt } from '@quiz-tool/shared';

export type ChoiceMediaVariant = 'mc-option' | 'ordering-card' | 'editor-preview' | 'comparison-row';

const variantClass: Record<ChoiceMediaVariant, string> = {
  'mc-option':
    'mx-auto block max-h-[5.25rem] w-auto max-w-[11rem] rounded-lg object-contain sm:max-h-[6.25rem] sm:max-w-[13rem]',
  'ordering-card':
    'h-[3.75rem] w-[3.75rem] shrink-0 rounded-lg object-cover sm:h-20 sm:w-20',
  'editor-preview': 'h-14 w-14 shrink-0 rounded-lg object-cover sm:h-16 sm:w-16',
  'comparison-row': 'h-10 w-10 shrink-0 rounded-md object-cover sm:h-12 sm:w-12',
};

interface ChoiceMediaDisplayProps {
  media: MediaAttachment;
  variant: ChoiceMediaVariant;
  className?: string;
  /** Use neutral alt only — hides spoiler metadata from alt/title during gameplay. */
  spoilerSafe?: boolean;
  genericAlt?: string;
}

export function ChoiceMediaDisplay({
  media,
  variant,
  className = '',
  spoilerSafe = false,
  genericAlt,
}: ChoiceMediaDisplayProps) {
  const src = media.previewUrl || media.url;
  const alt = spoilerSafe
    ? getGameplayImageAlt(genericAlt ?? 'Illustrasjon')
    : media.alt?.trim() || genericAlt?.trim() || 'Illustrasjon';

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`${variantClass[variant]} ${className}`.trim()}
    />
  );
}
