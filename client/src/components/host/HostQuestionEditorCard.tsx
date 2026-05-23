import { useEffect, useRef } from 'react';
import type { Question } from '@quiz-tool/shared';
import { HostQuestionStatusBadge } from './HostQuestionStatusBadge';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input, TextArea } from '../ui/Input';
import {
  getQuestionTitle,
  getQuestionTitleTrimmed,
  isQuestionIncomplete,
} from '../../lib/questionFactory';
import type { HostQuestionDisplayStatus } from '../../lib/questionDisplayStatus';
import { generateId } from '../../lib/id';

interface HostQuestionEditorCardProps {
  question: Question;
  index: number;
  displayStatus: HostQuestionDisplayStatus;
  isHighlighted?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChange: (question: Question) => void;
  onDelete: () => void;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function HostQuestionEditorCard({
  question,
  index,
  displayStatus,
  isHighlighted = false,
  isExpanded,
  onToggleExpand,
  onChange,
  onDelete,
  titleInputRef,
}: HostQuestionEditorCardProps) {
  const localTitleRef = useRef<HTMLInputElement>(null);
  const titleRef = titleInputRef ?? localTitleRef;
  const incomplete = isQuestionIncomplete(question);
  const bodyLines = question.lines.slice(1).map((l) => l.text).join('\n');
  const titlePreview = getQuestionTitleTrimmed(question) || 'Uten tittel';

  useEffect(() => {
    if (isHighlighted && isExpanded) {
      titleRef.current?.focus();
    }
  }, [isHighlighted, isExpanded, titleRef]);

  const updateTitle = (text: string) => {
    const lines = [...question.lines];
    if (lines.length === 0) {
      lines.push({ text, style: 'title' });
    } else {
      lines[0] = { ...lines[0], text, style: 'title' };
    }
    onChange({ ...question, lines });
  };

  const updateBody = (text: string) => {
    const first = question.lines[0] ?? { text: '', style: 'title' as const };
    const extra = text.split('\n').map((line) => ({ text: line, style: 'body' as const }));
    onChange({ ...question, lines: [first, ...extra] });
  };

  const updateHint = (hint: string) => {
    onChange({ ...question, hint: hint || undefined });
  };

  const updatePoints = (maxPoints: number) => {
    onChange({ ...question, maxPoints: Math.max(0, maxPoints) });
  };

  return (
    <article
      id={`question-editor-${question.id}`}
      className={`rounded-2xl border-2 bg-quiz-surface shadow-md transition-all duration-500 ${
        isHighlighted
          ? 'border-quiz-accent ring-4 ring-quiz-accent/40 scale-[1.01]'
          : incomplete
            ? 'border-slate-400/50 border-dashed'
            : 'border-quiz-accent/30'
      }`}
    >
      {isHighlighted && (
        <div className="rounded-t-[14px] bg-quiz-accent px-4 py-2 text-center text-sm font-semibold text-white animate-pulse">
          Nytt spørsmål — rediger her
        </div>
      )}

      <header className="flex items-start gap-3 p-4 pb-3 border-b border-quiz-border/80">
        <button
          type="button"
          onClick={onToggleExpand}
          className="shrink-0 mt-1 h-9 w-9 rounded-lg border border-quiz-border bg-quiz-surface-elevated text-quiz-muted hover:text-quiz-text"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Skjul redigering' : 'Vis redigering'}
        >
          {isExpanded ? '▾' : '▸'}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-quiz-accent mb-1">
            Spørsmål {index + 1} · Rediger
          </p>
          {!isExpanded && (
            <p className="text-base font-medium truncate text-quiz-text">{titlePreview}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="neutral">{question.type === 'open' ? 'Åpent svar' : 'Flervalg'}</Badge>
            {incomplete && <Badge variant="draft">Utkast</Badge>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <HostQuestionStatusBadge status={displayStatus} />
          <Button type="button" variant="danger" size="sm" onClick={onDelete}>
            Slett
          </Button>
        </div>
      </header>

      {isExpanded && (
        <div className="p-5 pt-4 space-y-5 bg-quiz-surface-elevated/30 rounded-b-2xl">
          <div>
            <label className="block text-sm font-semibold text-quiz-text mb-2">Spørsmål</label>
            <Input
              ref={titleRef}
              value={getQuestionTitle(question)}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Skriv spørsmål her..."
              className="text-lg bg-quiz-bg border-quiz-accent/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-quiz-muted mb-2">
              Tilleggslinjer (valgfritt)
            </label>
            <TextArea
              value={bodyLines}
              onChange={(e) => updateBody(e.target.value)}
              placeholder="Ekstra info, flere linjer…"
              rows={2}
              className="min-h-[72px] bg-quiz-bg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-quiz-muted mb-2">Hint</label>
              <Input
                value={question.hint ?? ''}
                onChange={(e) => updateHint(e.target.value)}
                placeholder="F.eks. begynner med P"
                className="bg-quiz-bg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-quiz-muted mb-2">Poeng</label>
              <Input
                type="number"
                min={0}
                max={20}
                value={question.maxPoints}
                onChange={(e) => updatePoints(Number(e.target.value))}
                className="bg-quiz-bg"
              />
            </div>
          </div>

          {question.type === 'open' ? (
            <OpenAnswersEditor question={question} onChange={onChange} />
          ) : (
            <McOptionsEditor question={question} onChange={onChange} />
          )}

          <div className="pt-2">
            <Button type="button" variant="danger" className="w-full" onClick={onDelete}>
              Slett dette spørsmålet
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

function OpenAnswersEditor({
  question,
  onChange,
}: {
  question: Question;
  onChange: (q: Question) => void;
}) {
  const answers = question.acceptedAnswers ?? [''];

  const setAnswer = (i: number, value: string) => {
    const next = [...answers];
    next[i] = value;
    onChange({ ...question, acceptedAnswers: next });
  };

  const addAnswer = () => {
    onChange({ ...question, acceptedAnswers: [...answers, ''] });
  };

  const removeAnswer = (i: number) => {
    if (answers.length <= 1) return;
    onChange({
      ...question,
      acceptedAnswers: answers.filter((_, idx) => idx !== i),
    });
  };

  return (
    <div className="rounded-xl bg-green-500/10 border-2 border-green-500/30 p-4 space-y-3">
      <p className="text-sm font-semibold text-green-300">Godkjente svar (fasit)</p>
      {answers.map((a, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={a}
            onChange={(e) => setAnswer(i, e.target.value)}
            placeholder="Skriv godkjent svar..."
            className="flex-1 bg-quiz-bg"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeAnswer(i)}
            disabled={answers.length <= 1}
            aria-label="Fjern svar"
          >
            ×
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={addAnswer}>
        + Flere godkjente svar
      </Button>
    </div>
  );
}

function McOptionsEditor({
  question,
  onChange,
}: {
  question: Question;
  onChange: (q: Question) => void;
}) {
  const options = question.options ?? [];

  const setOptionText = (id: string, text: string) => {
    onChange({
      ...question,
      options: options.map((o) => (o.id === id ? { ...o, text } : o)),
    });
  };

  const setCorrect = (id: string) => {
    onChange({
      ...question,
      options: options.map((o) => ({ ...o, isCorrect: o.id === id })),
    });
  };

  const addOption = () => {
    onChange({
      ...question,
      options: [...options, { id: generateId('opt'), text: '', isCorrect: false }],
    });
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    const filtered = options.filter((o) => o.id !== id);
    const hasCorrect = filtered.some((o) => o.isCorrect);
    onChange({
      ...question,
      options: hasCorrect ? filtered : filtered.map((o, i) => ({ ...o, isCorrect: i === 0 })),
    });
  };

  return (
    <div className="rounded-xl border-2 border-quiz-border bg-quiz-bg p-4 space-y-3">
      <p className="text-sm font-semibold text-quiz-text">Svaralternativer — trykk for riktig svar</p>
      {options.map((opt, i) => (
        <div key={opt.id} className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setCorrect(opt.id)}
            className={`shrink-0 h-11 w-11 rounded-full border-2 text-sm font-bold transition-colors ${
              opt.isCorrect
                ? 'border-green-500 bg-green-500/25 text-green-200'
                : 'border-quiz-border text-quiz-muted hover:border-quiz-muted'
            }`}
            title="Riktig svar"
          >
            {opt.isCorrect ? '✓' : i + 1}
          </button>
          <Input
            value={opt.text}
            onChange={(e) => setOptionText(opt.id, e.target.value)}
            placeholder={`Skriv alternativ ${i + 1}...`}
            className="flex-1 bg-quiz-surface"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeOption(opt.id)}
            disabled={options.length <= 2}
          >
            ×
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={addOption}>
        + Alternativ
      </Button>
    </div>
  );
}
