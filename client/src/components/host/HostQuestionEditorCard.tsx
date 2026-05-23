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
  const titlePreview = getQuestionTitleTrimmed(question) || '(Uten tittel — klikk for å redigere)';

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

  const typeLabel = question.type === 'open' ? 'Åpent svar' : 'Flervalg';

  return (
    <article
      id={`question-editor-${question.id}`}
      className={`rounded-2xl border-2 bg-quiz-surface shadow-md transition-all duration-300 overflow-hidden ${
        isHighlighted
          ? 'border-quiz-accent ring-4 ring-quiz-accent/40'
          : incomplete
            ? 'border-slate-400/50 border-dashed'
            : 'border-quiz-border'
      }`}
    >
      {isHighlighted && (
        <div className="bg-quiz-accent px-4 py-2 text-center text-sm font-semibold text-white">
          Nylig lagt til — rediger her
        </div>
      )}

      {/* Accordion header — always visible */}
      <div className="flex items-stretch gap-2 p-3 bg-quiz-surface-elevated/50">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 flex items-center gap-3 min-w-0 text-left rounded-xl px-3 py-2 hover:bg-quiz-surface-elevated transition-colors"
          aria-expanded={isExpanded}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-quiz-accent/20 text-sm font-bold text-quiz-accent"
            aria-hidden
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold truncate text-quiz-text">{titlePreview}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="neutral">{typeLabel}</Badge>
              {incomplete && <Badge variant="draft">Utkast</Badge>}
              <HostQuestionStatusBadge status={displayStatus} />
            </div>
          </div>
          <span className="shrink-0 text-quiz-muted text-lg px-1" aria-hidden>
            {isExpanded ? '▾' : '▸'}
          </span>
        </button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="shrink-0 self-center min-w-[4.5rem]"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Slett
        </Button>
      </div>

      {isExpanded && (
        <div className="p-5 pt-2 space-y-5 border-t border-quiz-border/80 bg-quiz-bg/40">
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

          <Button type="button" variant="danger" className="w-full" onClick={onDelete}>
            Slett dette spørsmålet
          </Button>
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
