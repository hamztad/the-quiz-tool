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
      {question.type === 'ordering' &&
        (question.orderingDirectionTop || question.orderingDirectionBottom) && (
          <div className="mt-2 rounded-2xl border border-quiz-accent/35 bg-quiz-accent/10 px-3 py-2 text-sm font-bold text-quiz-text">
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
              className="max-h-64 max-w-full rounded-xl object-contain"
            />
            {m.source === 'pixabay' && (
              <figcaption className="mt-1 text-xs text-quiz-muted break-words">
                Bilde fra Pixabay
                {m.photographer ? ` · ${m.photographer}` : ''}
                {m.pageUrl ? (
                  <>
                    {' · '}
                    <a
                      href={m.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-quiz-accent hover:underline"
                    >
                      Kilde
                    </a>
                  </>
                ) : null}
              </figcaption>
            )}
          </figure>
        ) : null,
      )}
    </div>
  );
}
