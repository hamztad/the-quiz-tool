import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  onClick?: () => void;
  elevated?: boolean;
}

export function Card({
  children,
  className = '',
  onClick,
  elevated = false,
  ...props
}: CardProps) {
  const base = `quiz-glass-card rounded-2xl p-4 sm:p-5 text-left w-full min-w-0 max-w-full overflow-hidden box-border ${
    elevated ? 'shadow-lg' : ''
  }`;
  const interactive = onClick
    ? 'block cursor-pointer quiz-hover-lift hover:border-violet-300/50 text-left'
    : '';

  const classes = `${base} ${interactive} ${className}`;

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
