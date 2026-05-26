import { useEffect, useRef, useState } from 'react';
import { parseQuizText } from '@quiz-tool/shared';
import { AiQuizPromptPanel } from './AiQuizPromptPanel';
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
  importText: string;
  onImportTextChange: (text: string) => void;
  existingCount: number;
  onAppend: (parsed: ReturnType<typeof parseQuizText>['questions']) => void;
  onReplaceAll: (parsed: ReturnType<typeof parseQuizText>['questions']) => void;
  autoFocus?: boolean;
  helpBelow?: boolean;
}

export function QuickImportPanel({
  importText,
  onImportTextChange,
  existingCount,
  onAppend,
  onReplaceAll,
  autoFocus = false,
  helpBelow = false,
}: QuickImportPanelProps) {
  const importTextRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState<ReturnType<typeof parseQuizText>['questions']>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [showReplace, setShowReplace] = useState(false);

  useEffect(() => {
    if (!autoFocus) return;
    const t = window.setTimeout(() => importTextRef.current?.focus(), 150);
    return () => window.clearTimeout(t);
  }, [autoFocus]);

  const hasImportText = importText.length > 0;

  const clearImportText = () => {
    onImportTextChange('');
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
        'Neste steg krever at du skriver ERSTAT i dialogen. Eksisterende spørsmål i listen erstattes. Fortsette?',
      )
    ) {
      return;
    }
    onReplaceAll(result.questions);
    setPreview([]);
    setParseErrors([]);
    setShowReplace(false);
  };

  const listHint =
    existingCount === 0
      ? 'Ingen spørsmål i listen fra før'
      : `${existingCount} spørsmål i listen fra før`;

  const helpBlock = (
    <details className="rounded-xl border border-quiz-border/50 bg-quiz-bg/40">
      <summary className="cursor-pointer px-4 py-3 text-sm text-quiz-muted hover:text-quiz-text">
        Hjelp: tekstformat og eksempel
      </summary>
      <div className="px-4 pb-4 space-y-2 border-t border-quiz-border/40">
        <p className="text-xs text-quiz-muted pt-3 break-words">
          Bruk <code className="text-quiz-text">Q</code> eller <code className="text-quiz-text">q</code> for
          spørsmål, <code className="text-quiz-text">A</code> eller <code className="text-quiz-text">a</code> for
          svar, <code className="text-quiz-text">MC</code> eller <code className="text-quiz-text">mc</code> for
          flervalg og <code className="text-quiz-text">*</code> for riktig alternativ.
        </p>
        <pre className="text-xs font-mono text-quiz-muted whitespace-pre-wrap break-words overflow-x-hidden">
          {IMPORT_EXAMPLE}
        </pre>
      </div>
    </details>
  );

  const utilityBlock = (
    <details className="rounded-xl border border-quiz-border/50 bg-quiz-bg/40">
      <summary className="cursor-pointer px-4 py-3 text-sm text-quiz-muted hover:text-quiz-text">
        Flere verktøy
      </summary>
      <div className="space-y-3 px-4 pb-4 border-t border-quiz-border/40 pt-3">
        <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={runPreview}>
          Forhåndsvis
        </Button>
        <button
          type="button"
          onClick={() => setShowReplace((v) => !v)}
          className="block text-xs text-quiz-muted hover:text-quiz-text underline"
        >
          {showReplace ? 'Skjul erstatte liste' : 'Erstatt hele listen (vær oppmerksom)'}
        </button>
        {showReplace && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
            <p className="text-xs text-quiz-muted break-words">
              Dette kan overskrive {existingCount} spørsmål i listen. Manuelt arbeid som ikke er
              brukt i aktiv quiz kan gå tapt.
            </p>
            <Button type="button" variant="secondary" size="sm" onClick={applyReplaceAll}>
              Erstatt hele listen
            </Button>
          </div>
        )}
      </div>
    </details>
  );

  return (
    <div className="quiz-page-content space-y-4">
      <div>
        {!helpBelow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-quiz-muted mb-2">
            Quiz-tekst
          </p>
        )}
        <div className="relative min-w-0 max-w-full overflow-hidden">
          <TextArea
            ref={importTextRef}
            value={importText}
            onChange={(e) => onImportTextChange(e.target.value)}
            rows={helpBelow ? 10 : 8}
            className={`font-mono text-sm bg-quiz-bg/60 min-h-[200px] quiz-user-text [word-break:break-word] ${hasImportText ? 'pr-14' : ''}`}
            placeholder="Lim inn eller skriv quiz her — Q/q, A/a, MC/mc og * for riktig svar…"
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

      <Button type="button" className="w-full" onClick={applyAppend}>
        Legg til
      </Button>

      <p className="text-xs text-quiz-muted">{listHint}</p>

      {parseErrors.map((e, i) => (
        <p key={i} className="text-sm text-red-400 break-words">
          {e}
        </p>
      ))}

      <AiQuizPromptPanel />

      {preview.length > 0 && <QuestionPreviewStrip questions={preview} />}

      {helpBelow ? (
        <>
          {utilityBlock}
          {helpBlock}
        </>
      ) : (
        utilityBlock
      )}
    </div>
  );
}