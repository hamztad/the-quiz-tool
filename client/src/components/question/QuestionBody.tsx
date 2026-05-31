import type { MediaCreditsDisplayMode, Question } from '@quiz-tool/shared';
import { getGameplayImageAlt } from '@quiz-tool/shared';
import { getQuestionTypeTheme } from '../../lib/questionTypeTheme';
import { MediaAttribution } from '../media/MediaAttribution';
import { QuestionDecorDisplay } from './QuestionDecorDisplay';

interface QuestionBodyProps {
  question: Question;
  showHint?: boolean;
  /** Type badge is shown on QuestionCard header in team view — skip duplicate heading. */
  showTypeHeading?: boolean;
  /** full = Gruizmaster/editor; deferred = participant during task; revealed = after lock/completion. */
  mediaCreditsMode?: MediaCreditsDisplayMode;
}

export function QuestionBody({
  question,
  showHint = true,
  showTypeHeading = true,
  mediaCreditsMode = 'full',
}: QuestionBodyProps) {
  const lineClass = 'break-words [overflow-wrap:anywhere]';
  const typeTheme = getQuestionTypeTheme(question);
  const spoilerSafeImage = mediaCreditsMode !== 'full';

  return (
    <div className="min-w-0 max-w-full space-y-3">
      {showTypeHeading && (
        <p className="text-xs font-bold uppercase tracking-wider text-quiz-muted">
          <span aria-hidden>{typeTheme.emoji}</span> {typeTheme.label}
        </p>
      )}
      <QuestionDecorDisplay question={question} />
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
          <div className="mt-2 rounded-2xl border-2 border-cyan-200/70 bg-gradient-to-r from-cyan-50 to-teal-50 px-4 py-3 text-sm sm:text-base font-bold text-cyan-900 break-words [overflow-wrap:anywhere]">
            {question.orderingDirectionTop || 'Øverst'} →{' '}
            {question.orderingDirectionBottom || 'Nederst'}
          </div>
        )}
      {question.media?.map((m, i) =>
        m.type === 'image' ? (
          <figure key={i} className="mt-3">
            <img
              src={m.url}
              alt={
                spoilerSafeImage
                  ? getGameplayImageAlt('Illustrasjonsbilde')
                  : m.alt?.trim() || 'Illustrasjon'
              }
              className="max-h-64 max-w-full rounded-2xl object-contain shadow-md ring-2 ring-white/80"
              loading="lazy"
              decoding="async"
            />
            <MediaAttribution media={m} mode={mediaCreditsMode} className="mt-2" />
          </figure>
        ) : null,
      )}
    </div>
  );
}
