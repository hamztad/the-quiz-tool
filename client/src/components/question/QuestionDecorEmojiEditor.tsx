import {
  getAutoQuestionDecorEmoji,
  getQuestionDecorEmojiSuggestions,
  normalizeQuestionDecorEmoji,
  questionHasDecorImage,
  resolveQuestionDecorEmoji,
  type Question,
} from '@quiz-tool/shared';

interface QuestionDecorEmojiEditorProps {
  question: Question;
  onChange: (question: Question) => void;
}

export function QuestionDecorEmojiEditor({ question, onChange }: QuestionDecorEmojiEditorProps) {
  if (questionHasDecorImage(question)) {
    return (
      <p className="text-xs text-quiz-muted rounded-lg border border-quiz-border/60 bg-quiz-bg/50 px-3 py-2">
        Dekor-emoji skjules når spørsmålet har bilde.
      </p>
    );
  }

  const preview = resolveQuestionDecorEmoji(question);
  const auto = getAutoQuestionDecorEmoji(question);
  const isCustom = Boolean(question.decorEmoji?.trim());
  const suggestions = getQuestionDecorEmojiSuggestions(question);

  const setCustom = (value: string) => {
    const normalized = normalizeQuestionDecorEmoji(value);
    onChange({ ...question, decorEmoji: normalized });
  };

  const useAuto = () => {
    onChange({ ...question, decorEmoji: undefined });
  };

  return (
    <section className="rounded-lg border border-quiz-border bg-quiz-bg p-3 min-w-0 max-w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-quiz-text">Dekor-emoji</p>
        {preview && (
          <span className="text-4xl leading-none" aria-hidden>
            {preview}
          </span>
        )}
      </div>
      <p className="text-xs text-quiz-muted leading-relaxed">
        Vises stort på oppgaven når det ikke er bilde. Standard er{' '}
        <span className="inline-block align-middle text-base leading-none" aria-hidden>
          {auto}
        </span>{' '}
        for denne typen.
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((emoji) => {
          const selected = preview === emoji;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => setCustom(emoji)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 text-2xl transition-colors ${
                selected
                  ? 'border-quiz-accent bg-quiz-accent/15'
                  : 'border-quiz-border bg-quiz-surface hover:border-quiz-accent/50'
              }`}
              aria-label={`Velg ${emoji}`}
              aria-pressed={selected}
            >
              <span aria-hidden>{emoji}</span>
            </button>
          );
        })}
      </div>
      <label className="block min-w-0">
        <span className="mb-1 block text-xs font-medium text-quiz-muted">Eget emoji</span>
        <input
          type="text"
          value={question.decorEmoji ?? ''}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Lim inn ett emoji"
          className="box-border w-full max-w-[12rem] rounded-xl border border-quiz-border bg-quiz-surface px-3 py-2 text-2xl text-center outline-none focus:border-quiz-accent min-h-[44px]"
          maxLength={8}
        />
      </label>
      {isCustom && (
        <button
          type="button"
          onClick={useAuto}
          className="text-xs font-semibold text-quiz-accent hover:underline"
        >
          Bruk automatisk ({auto})
        </button>
      )}
    </section>
  );
}
