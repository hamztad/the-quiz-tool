import { useEffect, useRef, useState } from 'react';
import type { MediaAttachment, Question } from '@quiz-tool/shared';
import { HostQuestionStatusBadge } from './HostQuestionStatusBadge';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EditorTextArea, Input } from '../ui/Input';
import {
  getQuestionTitle,
  getQuestionTitleTrimmed,
  isQuestionIncomplete,
} from '../../lib/questionFactory';
import type { HostQuestionDisplayStatus } from '../../lib/questionDisplayStatus';
import { generateId } from '../../lib/id';
import { searchPixabayImages, type PixabayImageResult } from '../../lib/pixabayApi';
import { getHostSession } from '../../lib/tokens';

interface HostQuestionEditorCardProps {
  question: Question;
  index: number;
  displayStatus: HostQuestionDisplayStatus;
  isHighlighted?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChange: (question: Question) => void;
  onDelete: () => void;
  roomId?: string;
  titleInputRef?: React.RefObject<HTMLTextAreaElement | null>;
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
  roomId,
  titleInputRef,
}: HostQuestionEditorCardProps) {
  const localTitleRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = titleInputRef ?? localTitleRef;
  const incomplete = isQuestionIncomplete(question);
  const bodyLines = question.lines.slice(1).map((l) => l.text).join('\n');
  const hasHint = Boolean(question.hint?.trim());
  const hasBody = bodyLines.trim().length > 0;
  const titlePreview = getQuestionTitleTrimmed(question) || '(Uten tittel — klikk for å redigere)';

  const [moreOpen, setMoreOpen] = useState(hasHint || hasBody);

  useEffect(() => {
    if (isHighlighted && isExpanded) {
      titleRef.current?.focus();
    }
  }, [isHighlighted, isExpanded, titleRef]);

  useEffect(() => {
    if (hasHint || hasBody) {
      setMoreOpen(true);
    }
  }, [question.id, hasHint, hasBody]);

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
      className={`max-w-full min-w-0 rounded-xl border bg-quiz-surface shadow-sm transition-all duration-300 overflow-hidden ${
        isHighlighted
          ? 'border-2 border-quiz-accent'
          : incomplete
            ? 'border-slate-400/50 border-dashed'
            : 'border-quiz-border'
      }`}
    >
      {isHighlighted && (
        <div className="bg-quiz-accent px-3 py-1.5 text-center text-xs font-semibold text-white">
          Nylig lagt til
        </div>
      )}

      <div className="flex flex-col gap-1.5 p-2 bg-quiz-surface-elevated/50 min-w-0 sm:flex-row sm:items-stretch">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 flex items-start gap-2 min-w-0 text-left rounded-lg px-2 py-2 hover:bg-quiz-surface-elevated transition-colors min-h-[44px]"
          aria-expanded={isExpanded}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-quiz-accent/20 text-xs font-bold text-quiz-accent"
            aria-hidden
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-quiz-text break-words [overflow-wrap:anywhere] line-clamp-2">
              {titlePreview}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 min-w-0 max-w-full overflow-hidden">
              <Badge variant="neutral">{typeLabel}</Badge>
              <PointsChip points={question.maxPoints} />
              {incomplete && <Badge variant="draft">Utkast</Badge>}
              {hasHint && (
                <span className="text-[10px] font-medium text-quiz-muted px-1.5 py-0.5 rounded-full bg-quiz-bg border border-quiz-border/60">
                  Har hint
                </span>
              )}
              {hasBody && (
                <span className="text-[10px] font-medium text-quiz-muted px-1.5 py-0.5 rounded-full bg-quiz-bg border border-quiz-border/60">
                  Ekstra tekst
                </span>
              )}
              <HostQuestionStatusBadge status={displayStatus} />
            </div>
          </div>
          <span className="shrink-0 text-quiz-muted text-base px-0.5 self-center" aria-hidden>
            {isExpanded ? '▾' : '▸'}
          </span>
        </button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="w-full shrink-0 sm:w-auto sm:self-center sm:min-h-[44px]"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Slett
        </Button>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-quiz-border/80 bg-quiz-bg/40 min-w-0 max-w-full overflow-x-hidden">
          <div className="min-w-0">
            <label className="block text-xs font-semibold text-quiz-text mb-1">Spørsmål</label>
            <EditorTextArea
              ref={titleRef}
              value={getQuestionTitle(question)}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Skriv spørsmål her..."
              minRows={1}
              className="text-sm sm:text-base font-medium bg-quiz-bg border-quiz-accent/30 py-2"
            />
          </div>

          {question.type === 'open' ? (
            <OpenAnswersEditor question={question} onChange={onChange} />
          ) : (
            <McOptionsEditor question={question} onChange={onChange} />
          )}

          <ImageAttachmentEditor question={question} onChange={onChange} roomId={roomId} />

          <details
            open={moreOpen}
            onToggle={(e) => setMoreOpen((e.target as HTMLDetailsElement).open)}
            className="rounded-lg border border-quiz-border/70 bg-quiz-surface/50 min-w-0 max-w-full overflow-hidden group"
          >
            <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-quiz-muted hover:text-quiz-text min-h-[44px] flex items-center gap-2 [&::-webkit-details-marker]:hidden">
              <span className="text-quiz-muted group-open:rotate-180 transition-transform shrink-0" aria-hidden>
                ▸
              </span>
              <span className="min-w-0 break-words">
                Flere valg: hint, tilleggstekst og poeng
              </span>
              {(hasHint || hasBody) && !moreOpen && (
                <span className="text-[10px] text-quiz-accent shrink-0">(utfylt)</span>
              )}
            </summary>
            <div className="space-y-3 px-3 pb-3 pt-0 border-t border-quiz-border/50">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-quiz-muted mb-1">Hint</label>
                <EditorTextArea
                  value={question.hint ?? ''}
                  onChange={(e) => updateHint(e.target.value)}
                  placeholder="F.eks. begynner med P"
                  minRows={1}
                  className="bg-quiz-bg py-2 text-sm"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-medium text-quiz-muted mb-1">
                  Tilleggstekst (valgfritt)
                </label>
                <EditorTextArea
                  value={bodyLines}
                  onChange={(e) => updateBody(e.target.value)}
                  placeholder="Ekstra info under spørsmålet…"
                  minRows={1}
                  className="bg-quiz-bg py-2 text-sm"
                />
              </div>

              <div className="min-w-0 max-w-[8rem]">
                <label className="block text-xs font-medium text-quiz-muted mb-1">Poeng</label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={question.maxPoints}
                  onChange={(e) => updatePoints(Number(e.target.value))}
                  className="bg-quiz-bg py-2 min-h-[44px]"
                  aria-label="Poeng for spørsmålet"
                />
              </div>
            </div>
          </details>
        </div>
      )}
    </article>
  );
}

function PointsChip({ points }: { points: number }) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-quiz-accent/15 border border-quiz-accent/30 px-2 py-0.5 text-[10px] font-bold tabular-nums text-quiz-accent shrink-0"
      title="Poeng"
    >
      {points}p
    </span>
  );
}

function ImageAttachmentEditor({
  question,
  onChange,
  roomId,
}: {
  question: Question;
  onChange: (q: Question) => void;
  roomId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pixabayQuery, setPixabayQuery] = useState('');
  const [pixabayLoading, setPixabayLoading] = useState(false);
  const [pixabayResults, setPixabayResults] = useState<PixabayImageResult[]>([]);
  const [resultsVisible, setResultsVisible] = useState(false);
  const image = question.media?.find((m) => m.type === 'image');

  const attachImage = (media: MediaAttachment) => {
    onChange({ ...question, media: [media] });
    setError(null);
  };

  const removeImage = () => {
    onChange({ ...question, media: undefined });
    setPixabayResults([]);
    setError(null);
  };

  const updateAlt = (alt: string) => {
    if (!image) return;
    attachImage({ ...image, alt });
  };

  const handlePixabaySearch = async () => {
    const query = pixabayQuery.trim();
    if (!roomId || query.length < 2) {
      setError('Skriv minst to tegn for å søke etter bilde.');
      return;
    }
    const session = getHostSession(roomId);
    if (!session) {
      setError('Fant ikke quizmaster-økt. Oppdater siden og prøv igjen.');
      return;
    }

    setPixabayLoading(true);
    setError(null);
    try {
      const results = await searchPixabayImages(session, query);
      setPixabayResults(results);
      setResultsVisible(results.length > 0);
      if (results.length === 0) {
        setError('Fant ingen bilder på Pixabay for dette søket.');
      }
    } catch (err) {
      setPixabayResults([]);
      setError(err instanceof Error ? err.message : 'Kunne ikke søke etter bilder.');
    } finally {
      setPixabayLoading(false);
    }
  };

  const attachPixabay = (result: PixabayImageResult) => {
    attachImage({
      type: 'image',
      url: result.imageUrl,
      previewUrl: result.previewUrl,
      alt: result.tags,
      source: 'pixabay',
      photographer: result.photographer,
      pageUrl: result.pageUrl,
    });
    setResultsVisible(false);
  };

  return (
    <section className="rounded-lg border border-quiz-border bg-quiz-bg p-3 space-y-3 min-w-0 max-w-full overflow-hidden">
      <div>
        <p className="text-xs font-semibold text-quiz-text">Søk bilde fra Pixabay</p>
        <p className="mt-1 text-xs text-quiz-muted">
          Velg et bilde fra Pixabay. Kilde og fotograf lagres automatisk med spørsmålet.
        </p>
      </div>

      {image && (
        <figure className="rounded-xl border border-quiz-border/70 bg-quiz-surface/60 p-3">
          <img
            src={image.url}
            alt={image.alt ?? ''}
            className="max-h-56 max-w-full rounded-lg object-contain"
          />
          {image.source === 'pixabay' && (
            <figcaption className="mt-2 text-xs text-quiz-muted break-words">
              Bilde fra Pixabay
              {image.photographer ? ` · ${image.photographer}` : ''}
              {image.pageUrl ? (
                <>
                  {' · '}
                  <a
                    href={image.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-quiz-accent hover:underline"
                  >
                    Kilde
                  </a>
                </>
              ) : null}
            </figcaption>
          )}
          <div className="mt-3 space-y-2">
            <Input
              value={image.alt ?? ''}
              onChange={(e) => updateAlt(e.target.value)}
              placeholder="Alt-tekst / kort bildebeskrivelse"
              className="text-sm"
            />
            <Button type="button" variant="ghost" size="sm" onClick={removeImage}>
              Fjern bilde
            </Button>
          </div>
        </figure>
      )}

      <div className="space-y-3 rounded-xl border border-quiz-border/60 bg-quiz-surface/40 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={pixabayQuery}
            onChange={(e) => setPixabayQuery(e.target.value)}
            placeholder="Søk på engelsk for best resultat"
            className="text-sm"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            onClick={handlePixabaySearch}
            disabled={pixabayLoading}
          >
            {pixabayLoading ? 'Søker…' : 'Søk'}
          </Button>
        </div>
        <p className="-mt-1 text-xs text-quiz-muted">
          Pixabay gir ofte best treff med engelske søkeord.
        </p>

        {pixabayResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-quiz-muted">
                {pixabayResults.length} bilder funnet
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setResultsVisible((current) => !current)}
              >
                {resultsVisible ? 'Skjul søkeresultater' : 'Vis søkeresultater'}
              </Button>
            </div>

            {resultsVisible && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {pixabayResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="min-w-0 rounded-xl border border-quiz-border bg-quiz-bg p-2 text-left hover:border-quiz-accent"
                    onClick={() => attachPixabay(result)}
                  >
                    <img
                      src={result.previewUrl || result.imageUrl}
                      alt={result.tags}
                      className="mx-auto h-20 w-full max-w-32 rounded-lg object-cover sm:h-24"
                    />
                    <span className="mt-2 block text-xs font-medium text-quiz-text">
                      Velg bilde
                    </span>
                    <span className="block text-[11px] leading-snug text-quiz-muted break-words">
                      Bilde fra Pixabay{result.photographer ? ` · ${result.photographer}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-300 break-words" role="alert">
          {error}
        </p>
      )}
    </section>
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
    <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 space-y-2 min-w-0 max-w-full overflow-x-hidden">
      <p className="text-xs font-semibold text-green-300">Godkjente svar (fasit)</p>
      {answers.map((a, i) => (
        <div key={i} className="flex gap-1.5 items-start min-w-0">
          <EditorTextArea
            value={a}
            onChange={(e) => setAnswer(i, e.target.value)}
            placeholder="Godkjent svar…"
            minRows={1}
            className="flex-1 min-w-0 bg-quiz-bg py-2 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 min-h-[44px] min-w-[44px] px-0"
            onClick={() => removeAnswer(i)}
            disabled={answers.length <= 1}
            aria-label="Fjern svar"
          >
            ×
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={addAnswer}>
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
    <div className="rounded-lg border border-quiz-border bg-quiz-bg p-3 space-y-2 min-w-0 max-w-full overflow-x-hidden">
      <p className="text-xs font-semibold text-quiz-text">Svaralternativer — trykk for riktig</p>
      {options.map((opt, i) => (
        <div key={opt.id} className="flex gap-1.5 items-start min-w-0">
          <button
            type="button"
            onClick={() => setCorrect(opt.id)}
            className={`shrink-0 h-11 w-11 rounded-full border-2 text-xs font-bold transition-colors ${
              opt.isCorrect
                ? 'border-green-500 bg-green-500/25 text-green-200'
                : 'border-quiz-border text-quiz-muted hover:border-quiz-muted'
            }`}
            title="Riktig svar"
          >
            {opt.isCorrect ? '✓' : i + 1}
          </button>
          <EditorTextArea
            value={opt.text}
            onChange={(e) => setOptionText(opt.id, e.target.value)}
            placeholder={`Alternativ ${i + 1}…`}
            minRows={1}
            className="flex-1 min-w-0 bg-quiz-surface py-2 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 min-h-[44px] min-w-[44px] px-0"
            onClick={() => removeOption(opt.id)}
            disabled={options.length <= 2}
            aria-label="Fjern alternativ"
          >
            ×
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={addOption}>
        + Alternativ
      </Button>
    </div>
  );
}
