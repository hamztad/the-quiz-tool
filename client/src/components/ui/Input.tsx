import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-quiz-border bg-quiz-surface-elevated px-4 py-3 text-quiz-text placeholder:text-quiz-muted focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-quiz-accent min-h-[44px] ${className}`}
      {...props}
    />
  );
}

export function TextArea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-xl border border-quiz-border bg-quiz-surface-elevated px-4 py-3 text-quiz-text placeholder:text-quiz-muted focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-quiz-accent min-h-[120px] resize-y ${className}`}
      {...props}
    />
  );
}
