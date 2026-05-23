import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-xl border border-quiz-border bg-quiz-surface-elevated px-4 py-3 text-quiz-text placeholder:text-quiz-muted focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-quiz-accent min-h-[44px] ${className}`}
      {...props}
    />
  );
});

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { className = '', ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={`w-full rounded-xl border border-quiz-border bg-quiz-surface-elevated px-4 py-3 text-quiz-text placeholder:text-quiz-muted focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-quiz-accent min-h-[120px] resize-y ${className}`}
      {...props}
    />
  );
});
