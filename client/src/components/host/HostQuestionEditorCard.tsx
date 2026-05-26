import { useEffect, useRef, useState } from 'react';
import type {
  AnagramGameConfig,
  DropBallConfig,
  EmojiHuntConfig,
  GamePointBand,
  MediaAttachment,
  MathExpressionConfig,
  MathExpressionRaceConfig,
  MathExpressionSingleConfig,
  OrderingItem,
  Question,
  TimerChallengeConfig,
} from '@quiz-tool/shared';
import {
  createDefaultMathRaceConfig,
  scrambleAnagramText,
  validateAnagramAnswerText,
  validateMathExpression,
  validateMathExpressionConfig,
} from '@quiz-tool/shared';
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
import { SortableOrderingList } from '../ordering/SortableOrderingList';

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
    const nextMaxPoints = Math.max(0, maxPoints);
    onChange({
      ...question,
      maxPoints: nextMaxPoints,
      game:
        question.game?.pointMode === 'rankedBands' && question.game.gameId === 'timerChallenge'
          ? { ...question.game, pointBands: [{ rank: 1, points: nextMaxPoints }] }
          : question.game,
    });
  };

  const typeLabel =
    question.type === 'open'
      ? 'Åpent svar'
      : question.type === 'mc'
        ? 'Flervalg'
        : question.type === 'ordering'
          ? 'Rekkefølge'
          : 'Spill';

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
          ) : question.type === 'mc' ? (
            <McOptionsEditor question={question} onChange={onChange} />
          ) : question.type === 'ordering' ? (
            <OrderingQuestionEditor question={question} onChange={onChange} />
          ) : (
            <GameQuestionEditor question={question} onChange={onChange} />
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
  const [pixabayLoading, setPixabayLoading] = useState<'nb' | 'en' | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pixabayResults, setPixabayResults] = useState<PixabayImageResult[]>([]);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [activeSearch, setActiveSearch] = useState<{
    query: string;
    language: 'nb' | 'en';
    page: number;
    hasMore: boolean;
  } | null>(null);
  const [noMoreResults, setNoMoreResults] = useState(false);
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

  const handlePixabaySearch = async (language: 'nb' | 'en') => {
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

    setPixabayLoading(language);
    setError(null);
    setSearchNotice(null);
    setNoMoreResults(false);
    try {
      const response = await searchPixabayImages(session, query, language, 1);
      setPixabayResults(response.results);
      setResultsVisible(response.results.length > 0);
      setActiveSearch({ query, language, page: response.page, hasMore: response.hasMore });
      if (response.translatedQuery) {
        setSearchNotice(`Oversatt søk: ${response.translatedQuery}`);
      } else if (response.notice) {
        setSearchNotice(response.notice);
      }
      if (response.results.length === 0) {
        setError('Fant ingen bilder på Pixabay for dette søket.');
        setNoMoreResults(true);
      }
    } catch (err) {
      setPixabayResults([]);
      setError(err instanceof Error ? err.message : 'Kunne ikke søke etter bilder.');
    } finally {
      setPixabayLoading(null);
    }
  };

  const loadMorePixabayResults = async () => {
    if (!roomId || !activeSearch || !activeSearch.hasMore) return;
    const session = getHostSession(roomId);
    if (!session) {
      setError('Fant ikke quizmaster-økt. Oppdater siden og prøv igjen.');
      return;
    }

    setLoadingMore(true);
    setError(null);
    try {
      const nextPage = activeSearch.page + 1;
      const response = await searchPixabayImages(
        session,
        activeSearch.query,
        activeSearch.language,
        nextPage,
      );
      setPixabayResults((current) => {
        const seen = new Set(current.map((r) => r.id));
        const appended = response.results.filter((r) => !seen.has(r.id));
        return [...current, ...appended];
      });
      setActiveSearch({
        query: activeSearch.query,
        language: activeSearch.language,
        page: response.page,
        hasMore: response.hasMore,
      });
      if (response.results.length === 0 || !response.hasMore) {
        setNoMoreResults(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste flere bilder.');
    } finally {
      setLoadingMore(false);
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
            placeholder="Søk på norsk eller engelsk"
            className="text-sm"
          />
        </div>
        <p className="-mt-1 text-xs text-quiz-muted">
          Norske søk oversettes til engelsk før bildesøk.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => handlePixabaySearch('nb')}
            disabled={pixabayLoading !== null}
          >
            {pixabayLoading === 'nb' ? 'Søker…' : '🇳🇴 Søk norsk'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => handlePixabaySearch('en')}
            disabled={pixabayLoading !== null}
          >
            {pixabayLoading === 'en' ? 'Searching…' : '🇬🇧 Search English'}
          </Button>
        </div>

        {searchNotice && (
          <p className="text-xs text-quiz-muted break-words" role="status">
            {searchNotice}
          </p>
        )}

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
                    className={`min-w-0 rounded-xl border p-2 text-left hover:border-quiz-accent ${
                      image?.url === result.imageUrl
                        ? 'border-quiz-accent bg-quiz-accent/10'
                        : 'border-quiz-border bg-quiz-bg'
                    }`}
                    onClick={() => attachPixabay(result)}
                    aria-pressed={image?.url === result.imageUrl}
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

            {resultsVisible && activeSearch && (
              <div className="pt-1">
                {noMoreResults || !activeSearch.hasMore ? (
                  <p className="text-xs text-quiz-muted">Ingen flere treff</p>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={loadMorePixabayResults}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Laster flere bilder...' : 'Vis flere bilder'}
                  </Button>
                )}
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

function GameQuestionEditor({
  question,
  onChange,
}: {
  question: Question;
  onChange: (q: Question) => void;
}) {
  if (question.game?.gameId === 'rainbowPuzzle') {
    const updateGame = (pointBands: GamePointBand[]) => {
      onChange({
        ...question,
        gameType: 'rainbowPuzzle',
        game: { ...question.game!, pointBands },
      });
    };
    const bands = question.game.pointBands ?? [
      { rank: 1, points: 5 },
      { rank: 2, points: 3 },
      { rank: 3, points: 1 },
    ];
    const setBand = (rank: number, points: number) => {
      const next = [1, 2, 3].map((item) => ({
        rank: item,
        points: item === rank ? Math.max(0, Math.round(points)) : (bands.find((b) => b.rank === item)?.points ?? 0),
      }));
      updateGame(next);
    };

    return (
      <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
        <div>
          <p className="text-xs font-semibold text-fuchsia-200">Spill: Rainbow Puzzle</p>
          <p className="mt-1 text-xs text-quiz-muted">
            Lagene spiller et fargerikt 5x5-brett. Høyeste poengsum vinner.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((rank) => (
            <label key={rank} className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-quiz-muted">
                {rank}. plass
              </span>
              <Input
                type="number"
                min={0}
                value={bands.find((band) => band.rank === rank)?.points ?? 0}
                onChange={(event) => setBand(rank, Number(event.target.value))}
                className="bg-quiz-bg py-2 min-h-[44px]"
              />
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (question.game?.gameId === 'emojiHunt') {
    const config = question.game;
    const bands = config.pointBands ?? [
      { rank: 1, points: 5 },
      { rank: 2, points: 3 },
      { rank: 3, points: 1 },
    ];
    const updateGame = (next: EmojiHuntConfig) => {
      onChange({
        ...question,
        gameType: 'emojiHunt',
        game: next,
      });
    };
    const setBand = (rank: number, points: number) => {
      updateGame({
        ...config,
        pointBands: [1, 2, 3].map((item) => ({
          rank: item,
          points: item === rank ? Math.max(0, Math.round(points)) : (bands.find((b) => b.rank === item)?.points ?? 0),
        })),
      });
    };

    return (
      <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
        <div>
          <p className="text-xs font-semibold text-sky-200">Spill: Emoji-jakt</p>
          <p className="mt-1 text-xs text-quiz-muted">
            Lagene finner målemojier raskest mulig. Laveste tid vinner.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-medium text-quiz-muted">
              Antall målemojier
            </span>
            <select
              value={config.targetCount}
              onChange={(event) =>
                updateGame({
                  ...config,
                  targetCount: Number(event.target.value) as EmojiHuntConfig['targetCount'],
                })
              }
              className="box-border w-full min-w-0 max-w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-quiz-accent min-h-[44px]"
            >
              {[2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>
                  {count} emoji
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-medium text-quiz-muted">
              Maks sekunder per emoji
            </span>
            <Input
              type="number"
              min={1}
              max={30}
              value={Math.round(config.maxMsPerTarget / 1000)}
              onChange={(event) =>
                updateGame({
                  ...config,
                  maxMsPerTarget: Math.max(1, Number(event.target.value)) * 1000,
                })
              }
              className="bg-quiz-bg py-2 min-h-[44px]"
            />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((rank) => (
            <label key={rank} className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-quiz-muted">
                {rank}. plass
              </span>
              <Input
                type="number"
                min={0}
                value={bands.find((band) => band.rank === rank)?.points ?? 0}
                onChange={(event) => setBand(rank, Number(event.target.value))}
                className="bg-quiz-bg py-2 min-h-[44px]"
              />
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (question.game?.gameId === 'dropBall') {
    const config = question.game;
    const bands = config.pointBands ?? [
      { rank: 1, points: 5 },
      { rank: 2, points: 3 },
      { rank: 3, points: 1 },
    ];
    const updateGame = (next: DropBallConfig) => {
      onChange({
        ...question,
        gameType: 'dropBall',
        game: next,
        maxPoints: 5,
      });
    };
    const setBand = (rank: number, points: number) => {
      updateGame({
        ...config,
        pointBands: [1, 2, 3].map((item) => ({
          rank: item,
          points: item === rank ? Math.max(0, Math.round(points)) : (bands.find((b) => b.rank === item)?.points ?? 0),
        })),
      });
    };

    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
        <div>
          <p className="text-xs font-semibold text-emerald-200">Spill: Drop the Ball</p>
          <p className="mt-1 text-xs text-quiz-muted">
            Lagene fjerner hindre og samler mynter. Høyeste totalscore vinner.
          </p>
        </div>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">
            Antall drops
          </span>
          <select
            value={config.totalRounds}
            onChange={(event) =>
              updateGame({
                ...config,
                totalRounds: Number(event.target.value) as DropBallConfig['totalRounds'],
              })
            }
            className="box-border w-full min-w-0 max-w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-quiz-accent min-h-[44px]"
          >
            {[1, 2, 3].map((rounds) => (
              <option key={rounds} value={rounds}>
                {rounds} {rounds === 1 ? 'drop' : 'drops'}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-xl border border-quiz-border/70 bg-quiz-bg/50 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted">
            Original-inspirert scoring
          </p>
          <p className="mt-1 text-sm font-semibold text-quiz-text">
            {config.obstacleCount} hindre · mynter {config.coinValues.map((value) => `${value / 1000}K`).join(', ')}
          </p>
          <p className="mt-1 text-xs text-quiz-muted">
            1 poeng per ms i lufta. Mynter gir 1k, 2k og 3k, med +{config.allCoinsBonus.toLocaleString('nb-NO')} for alle tre.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((rank) => (
            <label key={rank} className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-quiz-muted">
                {rank}. plass
              </span>
              <Input
                type="number"
                min={0}
                value={bands.find((band) => band.rank === rank)?.points ?? 0}
                onChange={(event) => setBand(rank, Number(event.target.value))}
                className="bg-quiz-bg py-2 min-h-[44px]"
              />
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (question.game?.gameId === 'anagram') {
    const config = question.game;
    const validation = validateAnagramAnswerText(config.answerText);
    const updateGame = (next: AnagramGameConfig) => {
      onChange({
        ...question,
        gameType: 'anagram',
        game: next,
      });
    };
    const updateAnswer = (answerText: string) => {
      const nextValidation = validateAnagramAnswerText(answerText);
      const normalized = nextValidation.normalizedText;
      updateGame({
        ...config,
        answerText: normalized,
        scrambledText: nextValidation.ok ? scrambleAnagramText(normalized) : config.scrambledText,
      });
    };

    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
        <div>
          <p className="text-xs font-semibold text-amber-200">Spill: Anagram</p>
          <p className="mt-1 text-xs text-quiz-muted">
            Lagene løser et stokket ord eller en kort frase. Riktig svar gir poeng.
          </p>
        </div>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">
            Anagram-svar
          </span>
          <Input
            type="text"
            value={config.answerText}
            onChange={(event) => updateAnswer(event.target.value)}
            placeholder="F.eks. DET ER FINT"
            className="bg-quiz-bg py-2 min-h-[44px]"
          />
        </label>
        <div className="rounded-xl border border-quiz-border/70 bg-quiz-bg/50 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-quiz-muted">
            Stokket visning
          </p>
          <p className="mt-1 break-words text-lg font-black tracking-wide text-quiz-text">
            {config.scrambledText || 'Skriv et gyldig svar for å lage anagram.'}
          </p>
        </div>
        <p className={`text-xs ${validation.ok ? 'text-quiz-muted' : 'text-red-200'}`}>
          {validation.letterCount}/20 bokstaver · {validation.words.length}/4 ord
          {validation.errors.length > 0 ? ` · ${validation.errors.join(' ')}` : ''}
        </p>
        {validation.warnings.map((warning) => (
          <p key={warning} className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
            {warning}
          </p>
        ))}
      </div>
    );
  }

  if (question.game?.gameId === 'mathExpression') {
    const config = question.game;
    const validation = validateMathExpressionConfig(config);
    const updateGame = (next: MathExpressionConfig) => {
      onChange({
        ...question,
        gameType: 'mathExpression',
        game: next,
        maxPoints: next.mode === 'single' ? question.maxPoints || 1 : 5,
      });
    };
    const setMode = (mode: MathExpressionConfig['mode']) => {
      if (mode === config.mode) return;
      updateGame(mode === 'race'
        ? createDefaultMathRaceConfig()
        : {
            gameId: 'mathExpression',
            mode: 'single',
            title: 'Regnestykke',
            instructions: 'Løs regnestykket.',
            expression: '2 + 2',
            rounding: 'exact',
            decimals: 0,
            rankingMode: 'highest',
            resultKind: 'directScore',
            pointMode: 'directScoreToPoints',
          });
    };
    const setBand = (rank: number, points: number) => {
      if (config.mode !== 'race') return;
      const bands = config.pointBands ?? [
        { rank: 1, points: 5 },
        { rank: 2, points: 3 },
        { rank: 3, points: 1 },
      ];
      updateGame({
        ...config,
        pointBands: [1, 2, 3].map((item) => ({
          rank: item,
          points: item === rank ? Math.max(0, Math.round(points)) : (bands.find((b) => b.rank === item)?.points ?? 0),
        })),
      });
    };

    return (
      <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
        <div>
          <p className="text-xs font-semibold text-indigo-200">Spill: Regnestykke</p>
          <p className="mt-1 text-xs text-quiz-muted">
            Velg enkelt auto-rettet regnestykke eller rankingbasert regnerace.
          </p>
        </div>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Modus</span>
          <select
            value={config.mode}
            onChange={(event) => setMode(event.target.value as MathExpressionConfig['mode'])}
            className="box-border w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text min-h-[44px]"
          >
            <option value="single">Enkelt regnestykke</option>
            <option value="race">Regnerace</option>
          </select>
        </label>

        {config.mode === 'single' ? (
          <MathSingleEditor config={config} onChange={updateGame} />
        ) : (
          <MathRaceEditor config={config} onChange={updateGame} setBand={setBand} />
        )}

        <details className="rounded-lg border border-quiz-border/70 bg-quiz-bg/50 px-3 py-2">
          <summary className="cursor-pointer text-xs font-bold text-quiz-muted">
            Hjelp: tegn du kan bruke
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-quiz-muted">
            <li>Pluss: +</li>
            <li>Minus: -</li>
            <li>Gange: * eller x</li>
            <li>Dele: / eller :</li>
            <li>Bruk 2-4 tall per regnestykke</li>
            <li>I regnerace kan du legge inn 2-10 regnestykker</li>
          </ul>
        </details>
        {!validation.ok && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {validation.errors.join(' ')}
          </p>
        )}
      </div>
    );
  }

  if (question.game?.gameId !== 'timerChallenge') {
    return (
      <div className="rounded-lg border border-quiz-border bg-quiz-bg p-3 text-sm text-quiz-muted">
        Dette spillet støttes ikke i editoren ennå.
      </div>
    );
  }

  const config = question.game;
  const targetSeconds = Math.max(1, Math.round(config.targetMs / 1000));

  const updateGame = (next: TimerChallengeConfig) => {
    onChange({ ...question, game: next });
  };

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
      <div>
        <p className="text-xs font-semibold text-blue-200">Spill: Stopp klokka</p>
        <p className="mt-1 text-xs text-quiz-muted">
          Lagene stopper klokka nærmest mulig måltiden. Nærmest vinner når spørsmålet låses.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label className="mb-1 block text-xs font-medium text-quiz-muted">
            Måltid i sekunder
          </label>
          <Input
            type="number"
            min={1}
            max={120}
            value={targetSeconds}
            onChange={(event) =>
              updateGame({
                ...config,
                targetMs: Math.max(1, Number(event.target.value)) * 1000,
              })
            }
            className="bg-quiz-bg py-2 min-h-[44px]"
          />
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-xs font-medium text-quiz-muted">
            Poengmodell
          </label>
          <select
            value={config.pointMode}
            onChange={(event) =>
              updateGame({
                ...config,
                pointMode: event.target.value as TimerChallengeConfig['pointMode'],
                pointBands:
                  event.target.value === 'rankedBands'
                    ? [{ rank: 1, points: question.maxPoints }]
                    : undefined,
              })
            }
            className="box-border w-full min-w-0 max-w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-quiz-accent min-h-[44px]"
          >
            <option value="winnerTakesAll">Vinneren får alle poeng</option>
            <option value="rankedBands">Rangerte poengbånd</option>
          </select>
        </div>
      </div>

      {config.pointMode === 'rankedBands' && (
        <p className="rounded-lg border border-quiz-border/70 bg-quiz-bg/60 px-3 py-2 text-xs text-quiz-muted">
          MVP: 1. plass får maks poeng. Flere poengbånd kan bygges ut senere.
        </p>
      )}
    </div>
  );
}

function MathSingleEditor({
  config,
  onChange,
}: {
  config: MathExpressionSingleConfig;
  onChange: (config: MathExpressionConfig) => void;
}) {
  const expressionValidation = validateMathExpression(config.expression);
  return (
    <div className="space-y-3">
      <label className="block min-w-0">
        <span className="mb-1 block text-xs font-medium text-quiz-muted">Regnestykke</span>
        <Input
          value={config.expression}
          onChange={(event) => onChange({ ...config, expression: event.target.value })}
          placeholder="F.eks. 12 / 3 + 4"
          className="bg-quiz-bg py-2 min-h-[44px]"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Avrunding</span>
          <select
            value={config.rounding}
            onChange={(event) =>
              onChange({
                ...config,
                rounding: event.target.value as MathExpressionSingleConfig['rounding'],
              })
            }
            className="box-border w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text min-h-[44px]"
          >
            <option value="exact">Eksakt svar</option>
            <option value="rounded">Avrundet svar</option>
          </select>
        </label>
        {config.rounding === 'rounded' && (
          <label className="block min-w-0">
            <span className="mb-1 block text-xs font-medium text-quiz-muted">Desimaler</span>
            <select
              value={config.decimals}
              onChange={(event) =>
                onChange({
                  ...config,
                  decimals: Number(event.target.value) as MathExpressionSingleConfig['decimals'],
                })
              }
              className="box-border w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text min-h-[44px]"
            >
              {[0, 1, 2].map((decimals) => (
                <option key={decimals} value={decimals}>{decimals}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {!expressionValidation.ok && (
        <p className="text-xs text-red-200">{expressionValidation.errors.join(' ')}</p>
      )}
      {expressionValidation.ok && (
        <p className="text-xs text-quiz-muted">
          Riktig svar: {expressionValidation.value}
        </p>
      )}
    </div>
  );
}

function MathRaceEditor({
  config,
  onChange,
  setBand,
}: {
  config: MathExpressionRaceConfig;
  onChange: (config: MathExpressionConfig) => void;
  setBand: (rank: number, points: number) => void;
}) {
  const bands = config.pointBands ?? [
    { rank: 1, points: 5 },
    { rank: 2, points: 3 },
    { rank: 3, points: 1 },
  ];
  const setExpression = (index: number, value: string) => {
    onChange({
      ...config,
      expressions: config.expressions.map((expression, i) => (i === index ? value : expression)),
    });
  };
  const addExpression = () => {
    if (config.expressions.length >= 10) return;
    onChange({ ...config, expressions: [...config.expressions, '2 + 2'] });
  };
  const removeExpression = (index: number) => {
    if (config.expressions.length <= 2) return;
    onChange({ ...config, expressions: config.expressions.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {config.expressions.map((expression, index) => {
          const validation = validateMathExpression(expression);
          return (
            <div key={index} className="rounded-xl border border-quiz-border/70 bg-quiz-bg/40 p-2">
              <div className="flex gap-2">
                <Input
                  value={expression}
                  onChange={(event) => setExpression(index, event.target.value)}
                  className="bg-quiz-bg py-2 min-h-[44px]"
                  aria-label={`Regnestykke ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => removeExpression(index)}
                  disabled={config.expressions.length <= 2}
                >
                  ×
                </Button>
              </div>
              {!validation.ok && (
                <p className="mt-1 text-xs text-red-200">{validation.errors.join(' ')}</p>
              )}
            </div>
          );
        })}
        <Button type="button" variant="secondary" size="sm" onClick={addExpression} disabled={config.expressions.length >= 10}>
          + Regnestykke
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Svarmodus</span>
          <select
            value={config.answerMode}
            onChange={(event) =>
              onChange({
                ...config,
                answerMode: event.target.value as MathExpressionRaceConfig['answerMode'],
              })
            }
            className="box-border w-full rounded-xl border border-quiz-border bg-quiz-bg px-4 py-2 text-sm text-quiz-text min-h-[44px]"
          >
            <option value="input">Skriv svar</option>
            <option value="multipleChoice">Tre alternativer</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Feilstraff sekunder</span>
          <Input
            type="number"
            min={0}
            value={Math.round(config.wrongPenaltyMs / 1000)}
            onChange={(event) =>
              onChange({
                ...config,
                wrongPenaltyMs: Math.max(0, Number(event.target.value)) * 1000,
              })
            }
            className="bg-quiz-bg py-2 min-h-[44px]"
          />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {[1, 2, 3].map((rank) => (
          <label key={rank} className="block min-w-0">
            <span className="mb-1 block text-xs font-medium text-quiz-muted">{rank}. plass</span>
            <Input
              type="number"
              min={0}
              value={bands.find((band) => band.rank === rank)?.points ?? 0}
              onChange={(event) => setBand(rank, Number(event.target.value))}
              className="bg-quiz-bg py-2 min-h-[44px]"
            />
          </label>
        ))}
      </div>
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

function OrderingQuestionEditor({
  question,
  onChange,
}: {
  question: Question;
  onChange: (q: Question) => void;
}) {
  const items = question.orderingItems ?? [];
  const order = question.orderingCorrectOrder ?? items.map((item) => item.id);
  const canAdd = items.length < 5;
  const canRemove = items.length > 3;
  const trimmedTexts = items.map((item) => item.text.trim().toLocaleLowerCase('nb')).filter(Boolean);
  const hasDuplicateTexts = new Set(trimmedTexts).size !== trimmedTexts.length;

  const setItemsAndOrder = (nextItems: OrderingItem[], nextOrder = order) => {
    const itemIds = new Set(nextItems.map((item) => item.id));
    const cleanedOrder = nextOrder.filter((id) => itemIds.has(id));
    const missingIds = nextItems.map((item) => item.id).filter((id) => !cleanedOrder.includes(id));
    onChange({
      ...question,
      orderingItems: nextItems,
      orderingCorrectOrder: [...cleanedOrder, ...missingIds],
    });
  };

  const updateItemText = (id: string, text: string) => {
    setItemsAndOrder(items.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const addItem = () => {
    if (!canAdd) return;
    const nextItem = { id: generateId('ord'), text: '' };
    setItemsAndOrder([...items, nextItem], [...order, nextItem.id]);
  };

  const removeItem = (id: string) => {
    if (!canRemove) return;
    setItemsAndOrder(
      items.filter((item) => item.id !== id),
      order.filter((itemId) => itemId !== id),
    );
  };

  return (
    <div className="rounded-lg border border-quiz-border bg-quiz-bg p-3 space-y-3 min-w-0 max-w-full overflow-x-hidden">
      <div>
        <p className="text-xs font-semibold text-quiz-text">Rekkefølge — fasit er topp til bunn</p>
        <p className="mt-1 text-xs text-quiz-muted">
          Dra elementene i riktig vertikal rekkefølge. Lagene får elementene tilfeldig stokket når
          de svarer.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Toppetikett</span>
          <Input
            value={question.orderingDirectionTop ?? ''}
            onChange={(event) =>
              onChange({ ...question, orderingDirectionTop: event.target.value || undefined })
            }
            placeholder="F.eks. Nord, Høyest, A, Først"
            className="bg-quiz-surface py-2"
          />
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-quiz-muted">Bunnetikett</span>
          <Input
            value={question.orderingDirectionBottom ?? ''}
            onChange={(event) =>
              onChange({ ...question, orderingDirectionBottom: event.target.value || undefined })
            }
            placeholder="F.eks. Sør, Lavest, Å, Sist"
            className="bg-quiz-surface py-2"
          />
        </label>
      </div>

      <SortableOrderingList
        items={items}
        order={order}
        onOrderChange={(nextOrder) => onChange({ ...question, orderingCorrectOrder: nextOrder })}
        topLabel={question.orderingDirectionTop || 'Øverst'}
        bottomLabel={question.orderingDirectionBottom || 'Nederst'}
        dragHandleLabel="Dra fasit-element"
        getItemContent={(item, index) => (
          <div className="flex min-h-[52px] items-start gap-2">
            <EditorTextArea
              value={item.text}
              onChange={(event) => updateItemText(item.id, event.target.value)}
              placeholder={`Element ${index + 1}…`}
              minRows={1}
              className="min-w-0 flex-1 bg-quiz-surface py-2 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[44px] min-w-[44px] shrink-0 px-0"
              onClick={() => removeItem(item.id)}
              disabled={!canRemove}
              aria-label="Fjern element"
            >
              ×
            </Button>
          </div>
        )}
      />

      {hasDuplicateTexts && (
        <p className="text-xs font-medium text-yellow-200">Elementene må være unike.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto"
          onClick={addItem}
          disabled={!canAdd}
        >
          + Element
        </Button>
        <span className="text-xs text-quiz-muted">{items.length}/5 elementer</span>
      </div>
    </div>
  );
}
