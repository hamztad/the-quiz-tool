import { useState } from 'react';
import { parseQuizText, type Question } from '@quiz-tool/shared';
import { QuestionPreviewStrip } from './QuestionPreviewStrip';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/Input';
import { generateId } from '../../lib/id';

const IMPORT_EXAMPLE = `Q Hva heter hovedstaden i Frankrike?
Hint: begynner med P
A Paris

MC Hvilken planet er størst?
*Jupiter
Mars
Venus
Saturn`;

interface QuickImportPanelProps {
  onImport: (questions: Question[]) => void;
}

export function QuickImportPanel({ onImport }: QuickImportPanelProps) {
  const [importText, setImportText] = useState(IMPORT_EXAMPLE);
  const [preview, setPreview] = useState<Omit<Question, 'id' | 'order'>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const runPreview = () => {
    const result = parseQuizText(importText);
    setPreview(result.questions);
    setParseErrors(result.errors);
  };

  const applyImport = () => {
    const result = parseQuizText(importText);
    if (result.errors.length > 0) {
      setParseErrors(result.errors);
      return;
    }
    const questions: Question[] = result.questions.map((q, i) => ({
      ...q,
      id: generateId('q'),
      order: i,
    }));
    onImport(questions);
    setPreview([]);
    setParseErrors([]);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-quiz-muted mb-2">
          Import-tekst
        </p>
        <TextArea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={8}
          className="font-mono text-sm bg-quiz-bg/60"
          placeholder="Lim inn quiz med Q, A, MC og * for riktig svar…"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={runPreview}>
          Vis forhåndsvisning
        </Button>
        <Button type="button" size="sm" onClick={applyImport}>
          Erstatt alle spørsmål i editoren
        </Button>
      </div>

      {parseErrors.map((e, i) => (
        <p key={i} className="text-sm text-red-400">
          {e}
        </p>
      ))}

      {preview.length > 0 && <QuestionPreviewStrip questions={preview} />}
    </div>
  );
}
