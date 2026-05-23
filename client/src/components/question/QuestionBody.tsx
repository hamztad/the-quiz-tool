import type { Question } from '@quiz-tool/shared';

interface QuestionBodyProps {
  question: Question;
  showHint?: boolean;
}

export function QuestionBody({ question, showHint = true }: QuestionBodyProps) {
  return (
    <div className="space-y-2">
      {question.lines.map((line, i) => (
        <p
          key={i}
          className={line.style === 'title' ? 'text-xl font-bold leading-snug' : 'text-base font-normal text-quiz-muted'}
        >
          {line.text}
        </p>
      ))}
      {showHint && question.hint && (
        <p className="text-sm text-quiz-muted italic">Hint: {question.hint}</p>
      )}
      {question.media?.map((m, i) =>
        m.type === 'image' ? (
          <img key={i} src={m.url} alt={m.alt ?? ''} className="mt-3 max-h-48 rounded-xl object-contain" />
        ) : null,
      )}
    </div>
  );
}
