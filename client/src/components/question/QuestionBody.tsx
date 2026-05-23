import type { Question } from '@quiz-tool/shared';

interface QuestionBodyProps {
  question: Question;
  showHint?: boolean;
}

export function QuestionBody({ question, showHint = true }: QuestionBodyProps) {
  const lineClass = 'break-words [overflow-wrap:anywhere]';
  return (
    <div className="min-w-0 max-w-full space-y-2">
      {question.lines.map((line, i) => (
        <p
          key={i}
          className={
            line.style === 'title'
              ? `text-xl font-bold leading-snug ${lineClass}`
              : `text-base font-normal text-quiz-muted ${lineClass}`
          }
        >
          {line.text}
        </p>
      ))}
      {showHint && question.hint && (
        <p className={`text-sm text-quiz-muted italic ${lineClass}`}>Hint: {question.hint}</p>
      )}
      {question.media?.map((m, i) =>
        m.type === 'image' ? (
          <img
            key={i}
            src={m.url}
            alt={m.alt ?? ''}
            className="mt-3 max-h-48 max-w-full rounded-xl object-contain"
          />
        ) : null,
      )}
    </div>
  );
}
