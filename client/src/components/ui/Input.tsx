import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-xl border border-quiz-border bg-quiz-surface-elevated px-4 py-3 text-quiz-text placeholder:text-quiz-muted focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-quiz-accent min-h-[44px] ${className}`}
      {...props}
    />
  );
}

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className = '', ...props }: TextAreaProps) {
  return (
    <textarea
      className={`w-full rounded-xl border border-quiz-border bg-quiz-surface-elevated px-4 py-3 text-quiz-text placeholder:text-quiz-muted focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-quiz-accent min-h-[120px] resize-y ${className}`}
      {...props}
    />
  );
}
