import { useRef, useState, type ChangeEvent } from 'react';
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
}

export function QuizBackupPanel({
  questions,
  quizTitle,
  hasUnsavedWork,
  onImportQuestions,
}: QuizBackupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="rounded-2xl border border-quiz-border/80 bg-quiz-surface/40 p-4 sm:p-5">
      <div className="mb-3">
        <p className="text-sm font-semibold text-quiz-text">Sikkerhetskopi</p>
        <p className="text-xs text-quiz-muted mt-1">
          Last ned, importer eller kopier quizen lokalt. Endringer lagres ikke på server før du
          trykker «Lagre alle spørsmål».
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
          Last ned quizfil
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          Importer quizfil
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
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      {feedback && (
        <p className="mt-3 text-sm text-green-400" role="status">
          {feedback}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
