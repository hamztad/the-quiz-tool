import type { MediaAttachment } from '@quiz-tool/shared';

interface MediaAttributionProps {
  media: MediaAttachment;
  className?: string;
}

export function MediaAttribution({ media, className = '' }: MediaAttributionProps) {
  const creator = media.photographer || media.creator;
  const sourceLabel =
    media.source === 'wikimedia'
      ? 'Wikimedia Commons'
      : media.source === 'upload'
        ? 'Privat opplasting'
        : 'Kilde';

  if (!creator && !media.license && !media.pageUrl) return null;

  return (
    <div className={`space-y-0.5 text-[11px] text-quiz-muted ${className}`.trim()}>
      {creator && <p>📷 Foto: {creator}</p>}
      {media.license && <p>📄 Lisens: {media.license}</p>}
      {media.pageUrl && (
        <p>
          🔗{' '}
          <a
            href={media.pageUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {sourceLabel}
          </a>
        </p>
      )}
    </div>
  );
}
