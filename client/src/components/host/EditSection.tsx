import type { ReactNode } from 'react';

interface EditSectionProps {
  title: string;
  description?: string;
  variant?: 'editor' | 'import' | 'muted';
  children: ReactNode;
  id?: string;
}

const variants = {
  editor:
    'border-quiz-accent/40 bg-gradient-to-b from-quiz-accent/10 to-quiz-surface',
  import: 'border-quiz-border/80 bg-quiz-surface/40',
  muted: 'border-quiz-border bg-quiz-surface/60',
};

export function EditSection({
  title,
  description,
  variant = 'editor',
  children,
  id,
}: EditSectionProps) {
  return (
    <section id={id} className={`rounded-2xl border p-5 sm:p-6 ${variants[variant]}`}>
      <header className="mb-5 pb-4 border-b border-white/10">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-quiz-muted mt-1.5 max-w-xl">{description}</p>}
      </header>
      {children}
    </section>
  );
}
