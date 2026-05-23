import type { ReactNode } from 'react';

interface HostSetupCardProps {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}

export function HostSetupCard({
  title,
  description,
  onClick,
  disabled = false,
  icon,
}: HostSetupCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full min-w-0 max-w-full box-border overflow-hidden rounded-2xl border-2 border-quiz-border bg-quiz-surface-elevated p-5 text-left transition-colors hover:border-quiz-accent/60 hover:bg-quiz-surface disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-quiz-border disabled:hover:bg-quiz-surface-elevated"
    >
      <div className="flex items-start gap-4 min-w-0">
        {icon && (
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-quiz-accent/15 text-2xl"
            aria-hidden
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-quiz-text break-words">{title}</p>
          <p className="mt-1 text-sm text-quiz-muted break-words">{description}</p>
        </div>
      </div>
    </button>
  );
}
