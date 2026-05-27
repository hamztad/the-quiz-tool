import type { Question, QuestionTimerConfig } from '@quiz-tool/shared';
import { normalizeQuestionTimerConfig } from '@quiz-tool/shared';

const PRESETS: { id: NonNullable<QuestionTimerConfig['preset']>; label: string }[] = [
  { id: '10s', label: '10 sek' },
  { id: '30s', label: '30 sek' },
  { id: '1m', label: '1 min' },
  { id: '5m', label: '5 min' },
];

interface QuestionTimerEditorProps {
  question: Question;
  onChange: (timer: QuestionTimerConfig | undefined) => void;
}

export function QuestionTimerEditor({ question, onChange }: QuestionTimerEditorProps) {
  const timer = question.timer ?? { mode: 'none' as const };
  const mode = timer.mode ?? 'none';

  const setMode = (next: QuestionTimerConfig['mode']) => {
    if (next === 'none') {
      onChange(undefined);
      return;
    }
    if (next === 'preset') {
      onChange(normalizeQuestionTimerConfig({ mode: 'preset', preset: '30s' }));
      return;
    }
    onChange(normalizeQuestionTimerConfig({ mode: 'custom', customMs: 60_000 }));
  };

  return (
    <div className="rounded-xl border border-indigo-200/60 bg-white/60 p-3 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted">⏱️ Tidsur</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('none')}
          className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${
            mode === 'none'
              ? 'border-violet-500 bg-violet-100 text-violet-900'
              : 'border-indigo-200/70 text-quiz-muted'
          }`}
        >
          Ingen
        </button>
        <button
          type="button"
          onClick={() => setMode('preset')}
          className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${
            mode === 'preset'
              ? 'border-violet-500 bg-violet-100 text-violet-900'
              : 'border-indigo-200/70 text-quiz-muted'
          }`}
        >
          Forvalg
        </button>
        <button
          type="button"
          onClick={() => setMode('custom')}
          className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${
            mode === 'custom'
              ? 'border-violet-500 bg-violet-100 text-violet-900'
              : 'border-indigo-200/70 text-quiz-muted'
          }`}
        >
          Egendefinert
        </button>
      </div>

      {mode === 'preset' && (
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange({ mode: 'preset', preset: p.id })}
              className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${
                timer.preset === p.id
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-900'
                  : 'border-indigo-200/70 text-quiz-muted'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {mode === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-quiz-muted">
            Minutter
            <input
              type="number"
              min={0}
              max={60}
              className="mt-1 w-full rounded-lg border-2 border-indigo-200/70 px-2 py-2 text-sm"
              value={Math.floor((timer.customMs ?? 60_000) / 60_000)}
              onChange={(e) => {
                const min = Math.max(0, Number(e.target.value) || 0);
                const sec = Math.floor(((timer.customMs ?? 0) % 60_000) / 1000);
                onChange(
                  normalizeQuestionTimerConfig({
                    mode: 'custom',
                    customMs: min * 60_000 + sec * 1000,
                  }),
                );
              }}
            />
          </label>
          <label className="text-xs text-quiz-muted">
            Sekunder
            <input
              type="number"
              min={0}
              max={59}
              className="mt-1 w-full rounded-lg border-2 border-indigo-200/70 px-2 py-2 text-sm"
              value={Math.floor(((timer.customMs ?? 60_000) % 60_000) / 1000)}
              onChange={(e) => {
                const sec = Math.min(59, Math.max(0, Number(e.target.value) || 0));
                const min = Math.floor((timer.customMs ?? 0) / 60_000);
                onChange(
                  normalizeQuestionTimerConfig({
                    mode: 'custom',
                    customMs: min * 60_000 + sec * 1000,
                  }),
                );
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
