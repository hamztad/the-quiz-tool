import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick, ...props }: CardProps) {
  const classes = `rounded-2xl border border-quiz-border bg-quiz-surface p-4 text-left w-full ${
    onClick ? 'cursor-pointer hover:bg-quiz-surface-elevated transition-colors' : ''
  } ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
