import { useState } from 'react';
import type { MediaAttachment, MediaCreditsDisplayMode } from '@quiz-tool/shared';
import {
  DEFERRED_MEDIA_CREDITS_MESSAGE,
  getMediaAttributionDetails,
  mediaHasAttribution,
  REVEAL_MEDIA_CREDITS_BUTTON_LABEL,
} from '@quiz-tool/shared';

interface MediaAttributionProps {
  media: MediaAttachment;
  mode?: MediaCreditsDisplayMode;
  className?: string;
  /** Tighter single- or two-line hint (e.g. ordering cards on mobile). */
  compact?: boolean;
}

function FullMediaAttribution({
  media,
  className,
}: {
  media: MediaAttachment;
  className: string;
}) {
  const details = getMediaAttributionDetails(media);
  if (!details) return null;

  return (
    <div className={`space-y-0.5 text-[11px] text-quiz-muted ${className}`.trim()}>
      {details.attributionText && <p>{details.attributionText}</p>}
      {details.creator && <p>📷 Foto: {details.creator}</p>}
      {details.license && <p>📄 Lisens: {details.license}</p>}
      {details.pageUrl && (
        <p>
          🔗{' '}
          <a
            href={details.pageUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-2"
          >
            {details.sourceLabel}
          </a>
        </p>
      )}
      {!details.pageUrl && details.sourceLabel && <p>🔗 {details.sourceLabel}</p>}
    </div>
  );
}

function RevealedMediaAttribution({
  media,
  className,
}: {
  media: MediaAttachment;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  if (!mediaHasAttribution(media)) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="text-left text-[11px] font-semibold text-violet-800 underline-offset-2 hover:underline"
        aria-expanded={open}
      >
        {open ? 'Skjul bildekreditering' : REVEAL_MEDIA_CREDITS_BUTTON_LABEL}
      </button>
      {open && <FullMediaAttribution media={media} className="mt-2" />}
    </div>
  );
}

export function MediaAttribution({
  media,
  mode = 'full',
  className = '',
  compact = false,
}: MediaAttributionProps) {
  if (mode === 'deferred') {
    if (!mediaHasAttribution(media)) return null;
    return (
      <p
        className={`text-quiz-muted ${compact ? 'text-[10px] leading-snug' : 'text-[11px] italic leading-relaxed'} ${className}`.trim()}
      >
        {DEFERRED_MEDIA_CREDITS_MESSAGE}
      </p>
    );
  }

  if (mode === 'revealed') {
    return <RevealedMediaAttribution media={media} className={className} />;
  }

  return <FullMediaAttribution media={media} className={className} />;
}
