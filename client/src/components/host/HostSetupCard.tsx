import type { ReactNode } from 'react';

export type HostSetupTone = 'purple' | 'cyan' | 'orange' | 'pink';

const toneStyles: Record<
  HostSetupTone,
  { card: string; icon: string }
> = {
  purple: {
    card: 'border-violet-300/60 bg-gradient-to-br from-violet-50/95 via-white/95 to-fuchsia-50/80 hover:border-violet-400',
    icon: 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md',
  },
  cyan: {
    card: 'border-cyan-300/60 bg-gradient-to-br from-cyan-50/95 via-white/95 to-sky-50/80 hover:border-cyan-400',
    icon: 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-md',
  },
  orange: {
    card: 'border-orange-300/60 bg-gradient-to-br from-orange-50/95 via-white/95 to-amber-50/80 hover:border-orange-400',
    icon: 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md',
  },
  pink: {
    card: 'border-pink-300/60 bg-gradient-to-br from-pink-50/95 via-white/95 to-violet-50/80 hover:border-pink-400',
    icon: 'bg-gradient-to-br from-pink-500 to-violet-500 text-white shadow-md',
  },
};

interface HostSetupCardProps {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  tone?: HostSetupTone;
}

export function HostSetupCard({
  title,
  description,
  onClick,
  disabled = false,
  icon,
  tone = 'purple',
}: HostSetupCardProps) {
  const styles = toneStyles[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`quiz-hover-lift w-full min-w-0 max-w-full box-border overflow-hidden rounded-2xl border-2 p-5 sm:p-6 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none ${styles.card}`}
    >
      <div className="flex items-start gap-4 min-w-0">
        {icon && (
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${styles.icon}`}
            aria-hidden
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="quiz-display text-xl font-bold text-quiz-text break-words sm:text-2xl">{title}</p>
          <p className="mt-1.5 text-sm sm:text-base text-quiz-muted break-words leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}
