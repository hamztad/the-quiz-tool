import { Link } from 'react-router-dom';

export type HostUiPhase = 'build' | 'present' | 'live';

interface HostPhaseIndicatorProps {
  active: HostUiPhase;
  /** Safe navigation targets only — omit steps that are not clickable. */
  links?: Partial<Record<HostUiPhase, string>>;
}

const steps: { id: HostUiPhase; label: string }[] = [
  { id: 'build', label: 'Lag quiz' },
  { id: 'present', label: 'Presenter' },
  { id: 'live', label: 'Kjør quiz' },
];

function StepContent({
  step,
  index,
  current,
  done,
}: {
  step: (typeof steps)[number];
  index: number;
  current: boolean;
  done: boolean;
}) {
  return (
    <>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          current
            ? 'bg-quiz-accent text-white'
            : done
              ? 'bg-green-500/20 text-green-400'
              : 'bg-quiz-surface-elevated text-quiz-muted border border-quiz-border'
        }`}
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
    </>
  );
}

/** Compact nav during live quiz — no decorative timeline that looks clickable. */
function HostLivePhaseNav({ presentHref }: { presentHref?: string }) {
  return (
    <nav
      className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm min-w-0"
      aria-label="Quizmaster-faser"
    >
      <span className="text-quiz-muted">Fase:</span>
      <span className="font-semibold text-quiz-text" aria-current="step">
        Kjør quiz
      </span>
      {presentHref && (
        <>
          <span className="text-quiz-muted" aria-hidden>
            ·
          </span>
          <Link
            to={presentHref}
            className="text-quiz-accent font-medium hover:underline underline-offset-2"
          >
            Presenter / invitasjon
          </Link>
        </>
      )}
    </nav>
  );
}

export function HostPhaseIndicator({ active, links }: HostPhaseIndicatorProps) {
  if (active === 'live' && !links?.build) {
    return <HostLivePhaseNav presentHref={links?.present} />;
  }

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
          const href = links?.[step.id];
          const isLink = Boolean(href) && !current;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              {isLink ? (
                <Link
                  to={href!}
                  className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2 rounded-lg hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-quiz-accent"
                >
                  <StepContent
                    step={step}
                    index={index}
                    current={current}
                    done={done}
                  />
                </Link>
              ) : (
                <span
                  className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2 cursor-default"
                  aria-current={current ? 'step' : undefined}
                >
                  <StepContent
                    step={step}
                    index={index}
                    current={current}
                    done={done}
                  />
                </span>
              )}
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
