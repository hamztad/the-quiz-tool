import { Button } from '../ui/Button';

interface EmptyQuestionsStateProps {
  onAddOpen: () => void;
  onAddMc: () => void;
  onAddOrdering: () => void;
  onOpenTekst: () => void;
}

export function EmptyQuestionsState({ onAddOpen, onAddMc, onAddOrdering, onOpenTekst }: EmptyQuestionsStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-quiz-border bg-quiz-surface/60 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-quiz-surface-elevated text-2xl">
        ?
      </div>
      <h3 className="text-lg font-semibold mb-2">Ingen spørsmål ennå</h3>
      <p className="text-sm text-quiz-muted max-w-sm mx-auto mb-6">
        Legg til spørsmål her i Editor, eller bytt til Tekst for å lime inn hele Gruizen på en gang.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button onClick={onAddOpen}>+ Åpent spørsmål</Button>
        <Button variant="secondary" onClick={onAddMc}>
          + Flervalg
        </Button>
        <Button variant="secondary" onClick={onAddOrdering}>
          + Rekkefølge
        </Button>
        <Button variant="ghost" onClick={onOpenTekst}>
          Gå til Tekst
        </Button>
      </div>
    </div>
  );
}
