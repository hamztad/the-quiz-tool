import { useEffect, useState, type CSSProperties } from 'react';

export interface AiShopLoadingStep {
  emoji: string;
  label: string;
}

interface AiShopGeneratingPanelProps {
  steps: AiShopLoadingStep[];
  title?: string;
  hint?: string;
}

const ORBIT_ICONS = ['✍️', '🔘', '↕️', '🎮', '✨', '🧠'];

export function AiShopGeneratingPanel({
  steps,
  title = 'Bygger Gruizen din …',
  hint = 'KI jobber — dette tar vanligvis under et halvt minutt.',
}: AiShopGeneratingPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % steps.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [steps.length]);

  return (
    <div
      className="ai-shop-generating relative overflow-hidden rounded-2xl border-2 border-violet-300/50 bg-gradient-to-br from-violet-500/15 via-fuchsia-400/10 to-cyan-400/15 px-4 py-8 sm:px-8 sm:py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="ai-shop-generating__glow pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-violet-400/30 blur-3xl" />
      <div className="ai-shop-generating__glow pointer-events-none absolute -bottom-10 right-0 h-32 w-32 rounded-full bg-cyan-400/25 blur-3xl" />

      <div className="relative mx-auto flex max-w-sm flex-col items-center text-center">
        <div className="ai-shop-generating__orbit relative mb-6 flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
          {ORBIT_ICONS.map((icon, index) => (
            <span
              key={icon}
              className="ai-shop-generating__orbit-item absolute text-xl sm:text-2xl"
              style={
                {
                  '--orbit-i': index,
                  '--orbit-n': ORBIT_ICONS.length,
                } as CSSProperties
              }
              aria-hidden
            >
              {icon}
            </span>
          ))}
          <span
            className="ai-shop-generating__core relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/60 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl shadow-lg shadow-violet-500/30 sm:h-[4.5rem] sm:w-[4.5rem] sm:text-4xl"
            aria-hidden
          >
            🧠
          </span>
        </div>

        <h3 className="ai-shop-generating__title font-display text-xl font-bold tracking-tight text-quiz-text sm:text-2xl">
          {title}
        </h3>
        <p className="mt-2 text-sm text-quiz-muted">{hint}</p>

        <div
          className="ai-shop-generating__progress mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/50"
          aria-hidden
        >
          <div className="ai-shop-generating__progress-bar h-full rounded-full" />
        </div>

        <ul className="mt-6 w-full space-y-2">
          {steps.map((step, index) => {
            const isActive = index === activeIndex;
            const isDone = index < activeIndex;
            return (
              <li
                key={step.label}
                className={`ai-shop-generating__step flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-500 ${
                  isActive
                    ? 'border-violet-400/60 bg-white/80 text-quiz-text shadow-md shadow-violet-500/10 scale-[1.02]'
                    : isDone
                      ? 'border-emerald-300/50 bg-emerald-50/60 text-emerald-900/80'
                      : 'border-quiz-border/40 bg-quiz-bg/30 text-quiz-muted'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${
                    isActive
                      ? 'ai-shop-generating__step-icon-active bg-violet-100'
                      : isDone
                        ? 'bg-emerald-100'
                        : 'bg-white/60'
                  }`}
                  aria-hidden
                >
                  {isDone ? '✓' : step.emoji}
                </span>
                <span className="min-w-0 flex-1 font-medium">{step.label}</span>
                {isActive && (
                  <span className="ai-shop-generating__dots flex gap-0.5" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
