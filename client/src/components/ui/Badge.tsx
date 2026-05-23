import type { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'open' | 'locked' | 'submitted' | 'active' | 'neutral';

const styles: Record<BadgeVariant, string> = {
  open: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  locked: 'bg-red-500/20 text-red-300 border-red-500/40',
  submitted: 'bg-green-500/20 text-green-300 border-green-500/40',
  active: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  neutral: 'bg-quiz-surface-elevated text-quiz-muted border-quiz-border',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = 'neutral', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
