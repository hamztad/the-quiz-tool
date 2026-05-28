import type { Question } from '@quiz-tool/shared';

interface ImageOnlyOptionsSettingProps {
  question: Question;
  onChange: (question: Question) => void;
  disabled?: boolean;
}

export function ImageOnlyOptionsSetting({
  question,
  onChange,
  disabled = false,
}: ImageOnlyOptionsSettingProps) {
  if (question.type !== 'mc' && question.type !== 'ordering') return null;

  const checked = question.imageOnlyOptions === true;

  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-violet-200/80 bg-violet-50/60 p-3">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-violet-600"
        checked={checked}
        disabled={disabled}
        onChange={(event) =>
          onChange({
            ...question,
            imageOnlyOptions: event.target.checked ? true : undefined,
          })
        }
      />
      <span className="min-w-0 space-y-1">
        <span className="block text-sm font-semibold text-violet-950">Bruk kun bildene</span>
        <span className="block text-xs leading-relaxed text-violet-900/90">
          Skjul tekst for deltakerne, men behold teksten som fasit/etikett.
        </span>
      </span>
    </label>
  );
}
