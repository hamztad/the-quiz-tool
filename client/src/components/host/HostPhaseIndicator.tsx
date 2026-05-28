import { Link } from 'react-router-dom';

export type HostUiPhase = 'build' | 'present' | 'live';

interface HostPhaseIndicatorProps {
  active: HostUiPhase;
  /** Safe navigation targets only — omit steps that are not clickable. */
  links?: Partial<Record<HostUiPhase, string>>;
}

const steps: { id: HostUiPhase; label: string; emoji: string }[] = [
  { id: 'build', label: 'Lag quiz', emoji: '✨' },
  { id: 'present', label: 'Presenter', emoji: '🎤' },
  { id: 'live', label: 'Kjør quiz', emoji: '🚀' },
];

function StepContent({
  step,
  current,
  done,
}: {
  step: (typeof steps)[number];
  current: boolean;
  done: boolean;
}) {
  return (
    <>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
          current
            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white ring-2 ring-violet-300/60'
            : done
              ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300/60'
              : 'bg-white/90 text-quiz-muted border-2 border-indigo-200/70'
        }`}
      >
        {done ? '✓' : step.emoji}
      </span>
      <span
        className={`hidden min-w-0 truncate text-sm font-bold sm:block ${
          current ? 'text-quiz-text' : 'text-quiz-muted'
        }`}
      >
        {step.label}
      </span>
    </>
  );
}

function HostLivePhaseNav({
  presentHref,
  buildHref,
}: {
  presentHref?: string;
  buildHref?: string;
}) {
  return (
    <nav
      className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-violet-200/60 bg-white/70 px-4 py-3 text-sm min-w-0 shadow-sm"
      aria-label="Quizmaster-faser"
    >
      <span className="text-2xl" aria-hidden>
        🚀
      </span>
      <span className="text-quiz-muted">Fase:</span>
      <span className="font-bold text-violet-800" aria-current="step">
        Kjør quiz
      </span>
      {buildHref && (
        <>
          <span className="text-quiz-muted" aria-hidden>
            ·
          </span>
          <Link
            to={buildHref}
            className="font-bold text-violet-700 hover:text-violet-900 hover:underline underline-offset-2"
          >
            ✏️ Rediger quiz
          </Link>
        </>
      )}
      {presentHref && (
        <>
          <span className="text-quiz-muted" aria-hidden>
            ·
          </span>
          <Link
            to={presentHref}
            className="font-bold text-violet-700 hover:text-violet-900 hover:underline underline-offset-2"
          >
            🎤 Presenter / invitasjon
          </Link>
        </>
      )}
    </nav>
  );
}

export function HostPhaseIndicator({ active, links }: HostPhaseIndicatorProps) {
  if (active === 'live') {
    return <HostLivePhaseNav presentHref={links?.present} buildHref={links?.build} />;
  }

  const activeIndex = steps.findIndex((s) => s.id === active);

  return (
    <nav
      className="mb-6 w-full min-w-0 max-w-full rounded-2xl border border-indigo-200/50 bg-white/60 p-3 shadow-sm backdrop-blur-sm"
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
                  className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2 rounded-xl p-1 quiz-hover-lift focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500"
                >
                  <StepContent step={step} current={current} done={done} />
                </Link>
              ) : (
                <span
                  className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2 cursor-default p-1"
                  aria-current={current ? 'step' : undefined}
                >
                  <StepContent step={step} current={current} done={done} />
                </span>
              )}
              {index < steps.length - 1 && (
                <span
                  className={`mx-0.5 h-1 min-w-[8px] flex-1 rounded-full sm:mx-1 ${
                    done ? 'bg-emerald-400/70' : 'bg-indigo-200/80'
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
