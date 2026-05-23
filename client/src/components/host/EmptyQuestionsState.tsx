import { Button } from '../ui/Button';

interface EmptyQuestionsStateProps {
  onAddOpen: () => void;
  onAddMc: () => void;
  onShowImport: () => void;
}

export function EmptyQuestionsState({ onAddOpen, onAddMc, onShowImport }: EmptyQuestionsStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-quiz-border bg-quiz-surface/60 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-quiz-surface-elevated text-2xl">
        ?
      </div>
      <h3 className="text-lg font-semibold mb-2">Ingen spørsmål ennå</h3>
      <p className="text-sm text-quiz-muted max-w-sm mx-auto mb-2">
        Trykk en av knappene <strong className="text-quiz-text">over</strong> — det nye spørsmålet
        dukker opp her i listen med en blå markering.
      </p>
      <p className="text-xs text-quiz-muted max-w-sm mx-auto mb-6">
        Eller bruk hurtigimport nederst på siden.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button onClick={onAddOpen}>+ Åpent spørsmål</Button>
        <Button variant="secondary" onClick={onAddMc}>
          + Flervalg
        </Button>
        <Button variant="ghost" onClick={onShowImport}>
          Hurtigimport
        </Button>
      </div>
    </div>
  );
}
