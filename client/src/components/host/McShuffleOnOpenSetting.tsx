import type { Question } from '@quiz-tool/shared';

interface McShuffleOnOpenSettingProps {
  question: Question;
  onChange: (question: Question) => void;
  disabled?: boolean;
}

export function McShuffleOnOpenSetting({
  question,
  onChange,
  disabled = false,
}: McShuffleOnOpenSettingProps) {
  if (question.type !== 'mc') return null;

  const checked = question.shuffleMcOptionsOnOpen === true;

  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-200/80 bg-emerald-50/60 p-3">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
        checked={checked}
        disabled={disabled}
        onChange={(event) =>
          onChange({
            ...question,
            shuffleMcOptionsOnOpen: event.target.checked ? true : undefined,
          })
        }
      />
      <span className="min-w-0 space-y-1">
        <span className="block text-sm font-semibold text-emerald-950">
          Bland alternativer ved hver åpning
        </span>
        <span className="block text-xs leading-relaxed text-emerald-900/90">
          Deltakerne får ny tilfeldig rekkefølge hver gang du åpner spørsmålet. Fasit og
          Gruizmaster-rekkefølge i editoren endres ikke.
        </span>
      </span>
    </label>
  );
}
