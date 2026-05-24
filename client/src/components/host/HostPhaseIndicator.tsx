export type HostUiPhase = 'build' | 'present' | 'live';

interface HostPhaseIndicatorProps {
  active: HostUiPhase;
}

const steps: { id: HostUiPhase; label: string }[] = [
  { id: 'build', label: 'Lag quiz' },
  { id: 'present', label: 'Presenter' },
  { id: 'live', label: 'Kjør quiz' },
];

export function HostPhaseIndicator({ active }: HostPhaseIndicatorProps) {
  const activeIndex = steps.findIndex((s) => s.id === active);

  return (
    <nav
      className="mb-6 w-full min-w-0 max-w-full"
      aria-label="Quizmaster-faser"
    >
      <ol className="flex min-w-0 max-w-full items-center gap-1 overflow-hidden sm:gap-2">
        {steps.map((step, index) => {
          const done = index < activeIndex;
          const current = step.id === active;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  current
                    ? 'bg-quiz-accent text-white'
                    : done
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-quiz-surface-elevated text-quiz-muted border border-quiz-border'
                }`}
                aria-current={current ? 'step' : undefined}
              >
                {done ? '✓' : index + 1}
              </span>
              <span
                className={`hidden min-w-0 truncate text-xs font-medium sm:block ${
                  current ? 'text-quiz-text' : 'text-quiz-muted'
                }`}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <span
                  className={`mx-0.5 h-px min-w-[8px] flex-1 sm:mx-1 ${
                    done ? 'bg-green-500/40' : 'bg-quiz-border'
                  }`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
