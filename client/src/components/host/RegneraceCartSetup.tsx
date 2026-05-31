import { useState } from 'react';
import {
  DEFAULT_REGNERACE_OPERATIONS,
  regneraceAnswerModeLabel,
  type MathExpressionAnswerMode,
  type RegneraceOperation,
  type RegneraceSlotPrefs,
} from '@quiz-tool/shared';
import { Button } from '../ui/Button';

const OPERATION_LABELS: { id: RegneraceOperation; label: string }[] = [
  { id: 'add', label: 'Addisjon' },
  { id: 'subtract', label: 'Subtraksjon' },
  { id: 'multiply', label: 'Multiplikasjon' },
  { id: 'divide', label: 'Divisjon' },
];

interface RegneraceCartSetupProps {
  initial?: RegneraceSlotPrefs;
  confirmLabel?: string;
  disabled?: boolean;
  onConfirm: (prefs: RegneraceSlotPrefs) => void;
  onCancel: () => void;
}

export function RegneraceCartSetup({
  initial,
  confirmLabel = 'Legg til Regnerace',
  disabled = false,
  onConfirm,
  onCancel,
}: RegneraceCartSetupProps) {
  const [answerMode, setAnswerMode] = useState<MathExpressionAnswerMode>(
    initial?.answerMode ?? 'input',
  );
  const [settingsOpen, setSettingsOpen] = useState(
    Boolean(initial?.enabledOperations && initial.enabledOperations.length > 0),
  );
  const [operations, setOperations] = useState<RegneraceOperation[]>(
    initial?.enabledOperations?.length
      ? initial.enabledOperations
      : [...DEFAULT_REGNERACE_OPERATIONS],
  );

  const toggleOperation = (op: RegneraceOperation) => {
    const next = operations.includes(op)
      ? operations.filter((item) => item !== op)
      : [...operations, op];
    if (next.length === 0) return;
    setOperations(next);
  };

  const handleConfirm = () => {
    const prefs: RegneraceSlotPrefs = { answerMode };
    if (settingsOpen) {
      prefs.enabledOperations = [...operations];
    }
    onConfirm(prefs);
  };

  return (
    <div className="rounded-xl border border-indigo-400/40 bg-indigo-500/10 p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-quiz-text">Regnerace</p>
        <p className="mt-1 text-xs text-quiz-muted">
          Velg hvordan spillerne svarer. Uten innstillinger for regnearter velger KI hvilke typer som
          brukes.
        </p>
      </div>

      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="text-xs font-semibold text-quiz-muted mb-1">Svarform</legend>
        {(['input', 'multipleChoice'] as const).map((mode) => (
          <label
            key={mode}
            className="flex items-center gap-2 rounded-lg border border-quiz-border/60 bg-quiz-bg/60 px-3 py-2 text-sm cursor-pointer"
          >
            <input
              type="radio"
              name="regnerace-answer-mode"
              checked={answerMode === mode}
              onChange={() => setAnswerMode(mode)}
            />
            <span className="font-medium text-quiz-text">{regneraceAnswerModeLabel(mode)}</span>
          </label>
        ))}
      </fieldset>

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-indigo-200"
          disabled={disabled}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          {settingsOpen ? 'Skjul innstillinger' : 'Innstillinger (regnearter)'}
        </Button>
        {settingsOpen && (
          <div className="mt-2 rounded-lg border border-quiz-border/60 bg-quiz-bg/40 p-3 space-y-2">
            <p className="text-xs font-semibold text-quiz-muted">Regnearter (minst én)</p>
            <div className="flex flex-wrap gap-2">
              {OPERATION_LABELS.map(({ id, label }) => {
                const on = operations.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleOperation(id)}
                    className={`rounded-xl border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                      on
                        ? 'border-indigo-400 bg-indigo-100 text-indigo-950'
                        : 'border-quiz-border bg-quiz-bg text-quiz-muted'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" className="flex-1" disabled={disabled} onClick={handleConfirm}>
          {confirmLabel}
        </Button>
        <Button type="button" variant="ghost" disabled={disabled} onClick={onCancel}>
          Avbryt
        </Button>
      </div>
    </div>
  );
}
