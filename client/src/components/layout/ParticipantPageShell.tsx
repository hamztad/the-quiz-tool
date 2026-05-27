import type { ReactNode } from 'react';
import { PageShell } from './PageShell';

interface ParticipantPageShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  emoji?: string;
}

/** Layout for participant-only pages (join, no host/admin chrome). */
export function ParticipantPageShell({ children, title, subtitle, emoji }: ParticipantPageShellProps) {
  return (
    <PageShell title={title} subtitle={subtitle} emoji={emoji}>
      <div className="mx-auto w-full min-w-0 max-w-md overflow-x-hidden box-border">{children}</div>
    </PageShell>
  );
}
