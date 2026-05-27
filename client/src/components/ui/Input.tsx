import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`box-border w-full min-w-0 max-w-full rounded-2xl border-2 border-indigo-200/70 bg-white/95 px-4 py-3 text-quiz-text shadow-sm placeholder:text-quiz-muted focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 min-h-[48px] [overflow-wrap:anywhere] ${className}`}
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
      className={`box-border w-full min-w-0 max-w-full rounded-2xl border-2 border-indigo-200/70 bg-white/95 px-4 py-3 text-quiz-text shadow-sm placeholder:text-quiz-muted focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 min-h-[120px] resize-y overflow-x-hidden [overflow-wrap:anywhere] break-words whitespace-pre-wrap ${className}`}
      {...props}
    />
  );
});

export interface EditorTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoGrow?: boolean;
  minRows?: number;
}

const editorFieldClasses =
  'box-border w-full min-w-0 max-w-full resize-none overflow-x-hidden quiz-user-text whitespace-pre-wrap text-sm sm:text-base leading-relaxed';

export const EditorTextArea = forwardRef<HTMLTextAreaElement, EditorTextAreaProps>(
  function EditorTextArea(
    {
      className = '',
      autoGrow = true,
      minRows = 1,
      value,
      onChange,
      rows,
      ...props
    },
    ref,
  ) {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const syncHeight = useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoGrow) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }, [autoGrow]);

    useLayoutEffect(() => {
      syncHeight();
    }, [value, syncHeight, minRows]);

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(event);
      if (autoGrow) {
        requestAnimationFrame(syncHeight);
      }
    };

    return (
      <textarea
        ref={innerRef}
        rows={rows ?? minRows}
        value={value}
        onChange={handleChange}
        className={`rounded-2xl border-2 border-indigo-200/70 bg-white/95 px-4 py-3 text-quiz-text shadow-sm placeholder:text-quiz-muted focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 min-h-[44px] ${editorFieldClasses} ${className}`}
        {...props}
      />
    );
  },
);
