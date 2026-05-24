import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  parseQuizFile,
  questionsToQuizText,
  type Question,
} from '@quiz-tool/shared';
import { Button } from '../ui/Button';
import { downloadQuizFile } from '../../lib/downloadQuizFile';

interface QuizBackupPanelProps {
  questions: Question[];
  quizTitle?: string;
  hasUnsavedWork: boolean;
  onImportQuestions: (questions: Question[]) => void;
  /** Open file picker once on mount (e.g. after setup «Importer quizfil»). */
  autoOpenImport?: boolean;
  /** Prominent import-first layout for «Importer quizfil» entry. */
  variant?: 'default' | 'importPrimary';
  /** Hide import — export/copy only (e.g. post-quiz). */
  exportOnly?: boolean;
}

export function QuizBackupPanel({
  questions,
  quizTitle,
  hasUnsavedWork,
  onImportQuestions,
  autoOpenImport = false,
  variant = 'default',
  exportOnly = false,
}: QuizBackupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!autoOpenImport || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    const t = window.setTimeout(() => fileInputRef.current?.click(), 300);
    return () => window.clearTimeout(t);
  }, [autoOpenImport]);

  const showFeedback = (message: string) => {
    setFeedback(message);
    setError(null);
    window.setTimeout(() => setFeedback(null), 4000);
  };

  const handleExport = () => {
    downloadQuizFile(questions, { title: quizTitle });
    showFeedback('Quizfil lastet ned.');
  };

  const handleCopyText = async () => {
    if (questions.length === 0) {
      setError('Ingen spørsmål å kopiere.');
      return;
    }
    try {
      await navigator.clipboard.writeText(questionsToQuizText(questions));
      showFeedback('Quiz kopiert som tekst.');
    } catch {
      setError('Kunne ikke kopiere til utklippstavlen.');
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);

    let parsed: unknown;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      setError('Kunne ikke lese filen. Sjekk at det er gyldig JSON.');
      return;
    }

    const result = parseQuizFile(parsed);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    const wouldReplaceUnsaved = hasUnsavedWork && questions.length > 0;
    if (wouldReplaceUnsaved) {
      const ok = window.confirm(
        `Du har ulagrede endringer (${questions.length} spørsmål). Importering erstatter det som står i editoren. Fortsette?`,
      );
      if (!ok) return;
    }

    onImportQuestions(result.data.questions);
    showFeedback(`${result.data.questions.length} spørsmål importert. Husk å lagre til server.`);
  };

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".json,application/json"
      className="sr-only"
      onChange={handleFileChange}
    />
  );

  if (variant === 'importPrimary') {
    return (
      <div className="rounded-2xl border-2 border-quiz-accent/40 bg-quiz-accent/10 p-4 sm:p-5 min-w-0 max-w-full overflow-hidden">
        <p className="text-base font-bold text-quiz-text mb-1">Importer quizfil</p>
        <p className="text-sm text-quiz-muted mb-4 break-words">
          Velg en JSON-fil fra The Quiz Tool. Etter import kan du redigere og lagre.
        </p>
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          Velg quizfil…
        </Button>
        {fileInput}
        {feedback && (
          <p className="mt-3 text-sm text-green-400 break-words" role="status">
            {feedback}
          </p>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-300 break-words" role="alert">
            {error}
          </p>
        )}
        <details className="mt-4 rounded-xl border border-quiz-border/50 bg-quiz-bg/30">
          <summary className="cursor-pointer px-3 py-2 text-xs text-quiz-muted hover:text-quiz-text">
            Eksport og annen sikkerhetskopi
          </summary>
          <div className="px-3 pb-3 flex flex-wrap gap-2 border-t border-quiz-border/40 pt-3">
            <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
              Last ned quizfil
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyText}
              disabled={questions.length === 0}
            >
              Kopier som tekst
            </Button>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-quiz-border/80 bg-quiz-surface/40 p-4 sm:p-5 min-w-0 max-w-full overflow-hidden">
      <div className="mb-3">
        <p className="text-sm font-semibold text-quiz-text">Sikkerhetskopi</p>
        <p className="text-xs text-quiz-muted mt-1 break-words">
          {exportOnly
            ? 'Last ned eller kopier quizen lokalt.'
            : 'Last ned, importer eller kopier quizen lokalt. Endringer lagres ikke på server før du trykker «Lagre alle spørsmål».'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
          Last ned quizfil
        </Button>
        {!exportOnly && (
          <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            Importer quizfil
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopyText}
          disabled={questions.length === 0}
        >
          Kopier som tekst
        </Button>
        {fileInput}
      </div>

      {feedback && (
        <p className="mt-3 text-sm text-green-400 break-words" role="status">
          {feedback}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-300 break-words" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
