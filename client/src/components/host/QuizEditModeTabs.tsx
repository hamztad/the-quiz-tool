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
    <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-3 sm:grid-cols-2">
      {modes.map(({ id, label, description }) => {
        const selected = mode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={selected}
            className={`w-full min-w-0 max-w-full box-border overflow-hidden rounded-2xl border-2 p-4 text-left transition-colors min-h-[72px] break-words ${
              selected
                ? 'border-quiz-accent bg-quiz-accent/15'
                : 'border-quiz-border bg-quiz-surface-elevated hover:border-quiz-accent/50 hover:bg-quiz-surface'
            }`}
          >
            <span className="block text-lg font-bold text-quiz-text break-words">{label}</span>
            <span className="mt-1 block text-sm text-quiz-muted break-words">{description}</span>
          </button>
        );
      })}
    </div>
  );
}
