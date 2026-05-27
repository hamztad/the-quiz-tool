type GruizMarkSize = 'hero' | 'md' | 'sm';

interface GruizMarkProps {
  size?: GruizMarkSize;
  className?: string;
  /** Short line under the logo (hero only by default). */
  tagline?: boolean;
}

const sizeClasses: Record<GruizMarkSize, string> = {
  hero: 'gruiz-mark--hero text-[clamp(2.75rem,10vw,4.25rem)]',
  md: 'gruiz-mark--md text-[clamp(2rem,6vw,3rem)]',
  sm: 'gruiz-mark--sm text-[clamp(1.35rem,4vw,1.75rem)]',
};

export function GruizMark({ size = 'md', className = '', tagline = size === 'hero' }: GruizMarkProps) {
  return (
    <div className={`gruiz-mark-wrap inline-flex flex-col items-center sm:items-start ${className}`}>
      <p className={`gruiz-mark quiz-display ${sizeClasses[size]}`} aria-label="Gruiz">
        <span className="gruiz-mark-sparkle" aria-hidden>
          ✨
        </span>
        <span className="gruiz-mark-word">
          <span className="gruiz-mark-gru">Gru</span>
          <span className="gruiz-mark-iz">iz</span>
        </span>
        <span className="gruiz-mark-dot" aria-hidden>
          .
        </span>
      </p>
      {tagline && (
        <p className="gruiz-mark-tagline mt-2 text-sm font-semibold tracking-wide text-quiz-muted sm:text-base">
          Live quiz-show
        </p>
      )}
    </div>
  );
}
