import { useRef, useState } from 'react';
import { parseQuizText } from '@quiz-tool/shared';
import { QuestionPreviewStrip } from './QuestionPreviewStrip';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/Input';

const IMPORT_EXAMPLE = `Q Hva heter hovedstaden i Frankrike?
Hint: begynner med P
A Paris

MC Hvilken planet er størst?
*Jupiter
Mars
Venus
Saturn`;

interface QuickImportPanelProps {
  existingCount: number;
  onAppend: (parsed: ReturnType<typeof parseQuizText>['questions']) => void;
  onReplaceAll: (parsed: ReturnType<typeof parseQuizText>['questions']) => void;
}

export function QuickImportPanel({ existingCount, onAppend, onReplaceAll }: QuickImportPanelProps) {
  const importTextRef = useRef<HTMLTextAreaElement>(null);
  const [importText, setImportText] = useState(IMPORT_EXAMPLE);
  const [preview, setPreview] = useState<ReturnType<typeof parseQuizText>['questions']>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [showDanger, setShowDanger] = useState(false);

  const hasImportText = importText.length > 0;

  const clearImportText = () => {
    setImportText('');
    setPreview([]);
    setParseErrors([]);
    requestAnimationFrame(() => importTextRef.current?.focus());
  };

  const parseCurrent = () => parseQuizText(importText);

  const runPreview = () => {
    const result = parseCurrent();
    setPreview(result.questions);
    setParseErrors(result.errors);
  };

  const applyAppend = () => {
    const result = parseCurrent();
    if (result.errors.length > 0) {
      setParseErrors(result.errors);
      return;
    }
    if (result.questions.length === 0) {
      setParseErrors(['Ingen spørsmål funnet i teksten.']);
      return;
    }
    onAppend(result.questions);
    setPreview([]);
    setParseErrors([]);
  };

  const applyReplaceAll = () => {
    const result = parseCurrent();
    if (result.errors.length > 0) {
      setParseErrors(result.errors);
      return;
    }
    if (result.questions.length === 0) {
      setParseErrors(['Ingen spørsmål funnet i teksten.']);
      return;
    }
    if (
      !window.confirm(
        'Neste steg krever at du skriver ERSTAT i dialogen. Alle eksisterende spørsmål slettes. Fortsette?',
      )
    ) {
      return;
    }
    onReplaceAll(result.questions);
    setPreview([]);
    setParseErrors([]);
    setShowDanger(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-quiz-muted mb-2">
          Quiz-tekst
        </p>
        <div className="relative">
          <TextArea
            ref={importTextRef}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            className={`font-mono text-sm bg-quiz-bg/60 ${hasImportText ? 'pr-14' : ''}`}
            placeholder="Lim inn quiz med Q, A, MC og * for riktig svar…"
          />
          {hasImportText && (
            <button
              type="button"
              onClick={clearImportText}
              className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-xl border border-quiz-border/80 bg-quiz-surface-elevated text-quiz-muted shadow-sm transition-colors hover:border-quiz-muted hover:bg-quiz-surface hover:text-quiz-text active:scale-95"
              aria-label="Tøm importfelt"
            >
              <span className="text-2xl font-light leading-none" aria-hidden>
                ×
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={runPreview}>
          Forhåndsvis
        </Button>
        <Button type="button" size="sm" onClick={applyAppend}>
          Legg til i quizen ({existingCount} spørsmål)
        </Button>
      </div>

      {parseErrors.map((e, i) => (
        <p key={i} className="text-sm text-red-400">
          {e}
        </p>
      ))}

      {preview.length > 0 && <QuestionPreviewStrip questions={preview} />}

      <div className="pt-4 border-t border-quiz-border/60">
        <button
          type="button"
          onClick={() => setShowDanger((v) => !v)}
          className="text-xs text-quiz-muted hover:text-red-300 underline"
        >
          {showDanger ? 'Skjul avansert' : 'Avansert (farlig)'}
        </button>

        {showDanger && (
          <div className="mt-3 rounded-xl border-2 border-red-500/50 bg-red-500/10 p-4 space-y-3">
            <p className="text-sm text-red-200">
              Sletter alle {existingCount} spørsmål i listen og erstatter med kun det som er i
              import-teksten. Manuelt arbeid går tapt.
            </p>
            <Button type="button" variant="danger" size="sm" onClick={applyReplaceAll}>
              Erstatt hele listen (krever bekreftelse)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
