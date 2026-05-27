export type QuizEditMode = 'editor' | 'tekst';

interface QuizEditModeTabsProps {
  mode: QuizEditMode;
  onChange: (mode: QuizEditMode) => void;
}

const modes: { id: QuizEditMode; label: string; description: string; emoji: string }[] = [
  {
    id: 'editor',
    label: 'Editor',
    description: 'Bygg quizen med spørsmålskort',
    emoji: '✨',
  },
  {
    id: 'tekst',
    label: 'Tekst',
    description: 'Lim inn eller skriv quiz som tekst',
    emoji: '📝',
  },
];

export function QuizEditModeTabs({ mode, onChange }: QuizEditModeTabsProps) {
  return (
    <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-3 sm:grid-cols-2">
      {modes.map(({ id, label, description, emoji }) => {
        const selected = mode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={selected}
            className={`quiz-hover-lift w-full min-w-0 max-w-full box-border overflow-hidden rounded-2xl border-2 p-4 sm:p-5 text-left min-h-[80px] break-words ${
              selected
                ? 'border-violet-400 bg-gradient-to-br from-violet-50 to-fuchsia-50/80 shadow-md'
                : 'border-indigo-200/70 bg-white/80 hover:border-violet-300'
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {emoji}
            </span>
            <span className="mt-2 block quiz-display text-xl font-bold text-quiz-text break-words">
              {label}
            </span>
            <span className="mt-1 block text-sm text-quiz-muted break-words">{description}</span>
          </button>
        );
      })}
    </div>
  );
}
