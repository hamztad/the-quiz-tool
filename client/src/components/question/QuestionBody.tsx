import type { Question } from '@quiz-tool/shared';
import { getQuestionTypeTheme } from '../../lib/questionTypeTheme';

interface QuestionBodyProps {
  question: Question;
  showHint?: boolean;
}

export function QuestionBody({ question, showHint = true }: QuestionBodyProps) {
  const lineClass = 'break-words [overflow-wrap:anywhere]';
  const typeTheme = getQuestionTypeTheme(question);

  return (
    <div className="min-w-0 max-w-full space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-quiz-muted">
        <span aria-hidden>{typeTheme.emoji}</span> {typeTheme.label}
      </p>
      {question.lines.map((line, i) => (
        <p
          key={i}
          className={
            line.style === 'title'
              ? `quiz-display text-2xl sm:text-3xl font-bold leading-snug text-quiz-text ${lineClass}`
              : `text-base sm:text-lg font-medium text-quiz-muted leading-relaxed ${lineClass}`
          }
        >
          {line.text}
        </p>
      ))}
      {showHint && question.hint && (
        <p className={`text-sm sm:text-base text-violet-700/90 italic font-medium ${lineClass}`}>
          💡 Hint: {question.hint}
        </p>
      )}
      {question.type === 'ordering' &&
        (question.orderingDirectionTop || question.orderingDirectionBottom) && (
          <div className="mt-2 rounded-2xl border-2 border-cyan-200/70 bg-gradient-to-r from-cyan-50 to-teal-50 px-4 py-3 text-sm sm:text-base font-bold text-cyan-900">
            {question.orderingDirectionTop || 'Øverst'} →{' '}
            {question.orderingDirectionBottom || 'Nederst'}
          </div>
        )}
      {question.media?.map((m, i) =>
        m.type === 'image' ? (
          <figure key={i} className="mt-3">
            <img
              src={m.url}
              alt={m.alt ?? ''}
              className="max-h-64 max-w-full rounded-2xl object-contain shadow-md ring-2 ring-white/80"
            />
          </figure>
        ) : null,
      )}
    </div>
  );
}
