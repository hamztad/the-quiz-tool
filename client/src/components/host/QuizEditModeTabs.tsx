export type QuizEditMode = 'editor' | 'tekst';

interface QuizEditModeTabsProps {
  mode: QuizEditMode;
  onChange: (mode: QuizEditMode) => void;
}

const modes: { id: QuizEditMode; label: string; description: string }[] = [
  {
    id: 'editor',
    label: 'Editor',
    description: 'Bygg quizen med spørsmålskort',
  },
  {
    id: 'tekst',
    label: 'Tekst',
    description: 'Lim inn eller skriv quiz som tekst',
  },
];

export function QuizEditModeTabs({ mode, onChange }: QuizEditModeTabsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {modes.map(({ id, label, description }) => {
        const selected = mode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={selected}
            className={`rounded-2xl border-2 p-4 text-left transition-colors min-h-[72px] ${
              selected
                ? 'border-quiz-accent bg-quiz-accent/15 ring-2 ring-quiz-accent/30'
                : 'border-quiz-border bg-quiz-surface-elevated hover:border-quiz-accent/50 hover:bg-quiz-surface'
            }`}
          >
            <span className="block text-lg font-bold text-quiz-text">{label}</span>
            <span className="mt-1 block text-sm text-quiz-muted">{description}</span>
          </button>
        );
      })}
    </div>
  );
}
