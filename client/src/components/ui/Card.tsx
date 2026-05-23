import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-2xl border border-quiz-border bg-quiz-surface p-4 text-left w-full ${onClick ? 'cursor-pointer hover:bg-quiz-surface-elevated transition-colors' : ''} ${className}`}
    >
      {children}
    </Tag>
  );
}
