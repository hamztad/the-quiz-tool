import type { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'open' | 'locked' | 'submitted' | 'active' | 'neutral' | 'draft';

const styles: Record<BadgeVariant, string> = {
  open: 'bg-amber-100 text-amber-900 border-amber-300/70',
  locked: 'bg-red-100 text-red-800 border-red-300/70',
  submitted: 'bg-emerald-100 text-emerald-900 border-emerald-300/70',
  active: 'bg-blue-100 text-blue-900 border-blue-300/70',
  draft: 'bg-slate-100 text-slate-700 border-slate-300/70',
  neutral: 'bg-white/80 text-quiz-muted border-indigo-200/60',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = 'neutral', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center whitespace-normal text-center rounded-full border px-2.5 py-0.5 text-[10px] leading-tight font-bold sm:px-3 sm:py-1 sm:text-xs sm:leading-normal ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
