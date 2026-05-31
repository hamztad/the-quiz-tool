import { getHostAddQuestionLabel } from '../../lib/questionTypeTheme';
import { AddQuestionTypeLabel } from './AddQuestionTypeLabel';
import { Button } from '../ui/Button';

interface EmptyQuestionsStateProps {
  onAddOpen: () => void;
  onAddMc: () => void;
  onAddOrdering: () => void;
  onOpenTekst: () => void;
}

export function EmptyQuestionsState({ onAddOpen, onAddMc, onAddOrdering, onOpenTekst }: EmptyQuestionsStateProps) {
  const openMeta = getHostAddQuestionLabel('open');
  const mcMeta = getHostAddQuestionLabel('mc', 'short');
  const orderingMeta = getHostAddQuestionLabel('ordering');

  return (
    <div className="rounded-2xl border border-dashed border-quiz-border bg-quiz-surface/60 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-quiz-surface-elevated text-2xl">
        📋
      </div>
      <h3 className="text-lg font-semibold mb-2">Ingen spørsmål ennå</h3>
      <p className="text-sm text-quiz-muted max-w-sm mx-auto mb-6">
        Legg til spørsmål her i Editor, eller bytt til Tekst for å lime inn hele Gruizen på en gang.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center flex-wrap">
        <Button onClick={onAddOpen}>
          <AddQuestionTypeLabel emoji={openMeta.emoji} text={openMeta.text} />
        </Button>
        <Button variant="secondary" onClick={onAddMc}>
          <AddQuestionTypeLabel emoji={mcMeta.emoji} text={mcMeta.text} />
        </Button>
        <Button variant="secondary" onClick={onAddOrdering}>
          <AddQuestionTypeLabel emoji={orderingMeta.emoji} text={orderingMeta.text} />
        </Button>
        <Button variant="ghost" onClick={onOpenTekst}>
          <AddQuestionTypeLabel emoji="📝" text="Gå til Tekst" />
        </Button>
      </div>
    </div>
  );
}
