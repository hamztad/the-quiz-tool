import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Decorative emoji shown beside the title */
  emoji?: string;
  wide?: boolean;
}

export function PageShell({ children, title, subtitle, emoji, wide = false }: PageShellProps) {
  return (
    <div className="min-h-screen w-full max-w-full min-w-0 overflow-x-hidden">
      <main className="mx-auto w-full min-w-0 max-w-full box-border px-4 py-8 sm:py-10 md:max-w-4xl overflow-x-hidden">
        <div
          className={`mx-auto w-full min-w-0 overflow-x-hidden quiz-animate-in ${
            wide ? 'max-w-4xl' : 'max-w-lg md:max-w-none'
          }`}
        >
          {(title || subtitle) && (
            <header className="mb-8 min-w-0 max-w-full overflow-hidden text-center sm:text-left">
              {title && (
                <h1 className="quiz-display text-3xl font-bold tracking-tight break-words [overflow-wrap:anywhere] sm:text-4xl md:text-5xl">
                  {emoji && (
                    <span className="mr-2 inline-block" aria-hidden>
                      {emoji}
                    </span>
                  )}
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-quiz-muted mt-2 break-words [overflow-wrap:anywhere] text-base sm:text-lg leading-relaxed max-w-2xl">
                  {subtitle}
                </p>
              )}
            </header>
          )}
          <div className="min-w-0 w-full max-w-full overflow-x-hidden">{children}</div>
        </div>
      </main>
    </div>
  );
}
