import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function PageShell({ children, title, subtitle }: PageShellProps) {
  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto md:max-w-4xl">
      {(title || subtitle) && (
        <header className="mb-6">
          {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
          {subtitle && <p className="text-quiz-muted mt-1">{subtitle}</p>}
        </header>
      )}
      {children}
    </div>
  );
}
