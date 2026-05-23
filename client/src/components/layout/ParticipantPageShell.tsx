import type { ReactNode } from 'react';
import { PageShell } from './PageShell';

interface ParticipantPageShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

/** Layout for participant-only pages (join, no host/admin chrome). */
export function ParticipantPageShell({ children, title, subtitle }: ParticipantPageShellProps) {
  return (
    <PageShell title={title} subtitle={subtitle}>
      <div className="mx-auto w-full max-w-md py-4 sm:py-6">{children}</div>
    </PageShell>
  );
}
