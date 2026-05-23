import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function PageShell({ children, title, subtitle }: PageShellProps) {
  return (
    <div className="min-h-screen w-full min-w-0 max-w-lg mx-auto md:max-w-4xl overflow-x-hidden box-border px-4 py-6">
      {(title || subtitle) && (
        <header className="mb-6 min-w-0 max-w-full">
          {title && (
            <h1 className="text-2xl font-bold tracking-tight break-words [overflow-wrap:anywhere]">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-quiz-muted mt-1 break-words [overflow-wrap:anywhere] text-sm sm:text-base">
              {subtitle}
            </p>
          )}
        </header>
      )}
      <div className="min-w-0 max-w-full">{children}</div>
    </div>
  );
}
