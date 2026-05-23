import type { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'open' | 'locked' | 'submitted' | 'active' | 'neutral' | 'draft';

const styles: Record<BadgeVariant, string> = {
  open: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  locked: 'bg-red-500/20 text-red-300 border-red-500/40',
  submitted: 'bg-green-500/20 text-green-300 border-green-500/40',
  active: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  draft: 'bg-slate-500/25 text-slate-200 border-slate-400/40',
  neutral: 'bg-quiz-surface-elevated text-quiz-muted border-quiz-border',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = 'neutral', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] leading-tight font-medium sm:px-2.5 sm:py-0.5 sm:text-xs sm:leading-normal ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
