import { useEffect, useMemo, useState } from 'react';
import type { MediaAttachment } from '@quiz-tool/shared';
import {
  searchImageProvider,
  type ImageProvider,
  type ImageSearchResult,
  uploadPrivateImage,
} from '../../lib/pixabayApi';
import { imageResultToMedia } from '../../lib/pixabayMedia';
import { getHostSession } from '../../lib/tokens';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ChoiceMediaDisplay } from './ChoiceMediaDisplay';

interface PixabayImagePickerProps {
  roomId?: string;
  media?: MediaAttachment;
  onMediaChange: (media: MediaAttachment | undefined) => void;
  compact?: boolean;
  /** When false, søkepanel er lukket til bruker åpner det (unngår forveksling med svarfelt). */
  defaultSearchExpanded?: boolean;
  /** Inne i ImageSearchModal — skjul egen lukk/vis-toggle (modal har ×). */
  embeddedInModal?: boolean;
  label?: string;
  hint?: string;
}

export function PixabayImagePicker({
  roomId,
  media,
  onMediaChange,
  compact = false,
  defaultSearchExpanded,
  embeddedInModal = false,
  label = 'Bilde fra Pixabay',
  hint,
}: PixabayImagePickerProps) {
  const [provider, setProvider] = useState<ImageProvider>(media?.source ?? 'pixabay');
  const [expanded, setExpanded] = useState(
    defaultSearchExpanded ?? (compact ? false : !media),
  );
  const [error, setError] = useState<string | null>(null);
  const [pixabayQuery, setPixabayQuery] = useState('');
  const [pixabayLoading, setPixabayLoading] = useState<'nb' | 'en' | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [resultPages, setResultPages] = useState<ImageSearchResult[][]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [activeSearch, setActiveSearch] = useState<{
    query: string;
    language: 'nb' | 'en';
    page: number;
    hasMore: boolean;
  } | null>(null);
  const [noMoreResults, setNoMoreResults] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const currentResults = useMemo(
    () => resultPages[pageIndex] ?? [],
    [resultPages, pageIndex],
  );
  const totalPages = resultPages.length;
  const onLatestPage = pageIndex === totalPages - 1;

  useEffect(() => {
    if (media?.source === 'pixabay' || media?.source === 'wikimedia' || media?.source === 'upload') {
      setProvider(media.source);
    }
  }, [media?.source]);

  const resetSearchResults = () => {
    setResultPages([]);
    setPageIndex(0);
    setResultsVisible(false);
    setActiveSearch(null);
    setNoMoreResults(false);
    setSearchNotice(null);
  };

  const attachPixabay = (result: ImageSearchResult) => {
    onMediaChange(imageResultToMedia(result, provider));
    setResultsVisible(false);
    setExpanded(false);
    setError(null);
  };

  const removeImage = () => {
    onMediaChange(undefined);
    resetSearchResults();
    setExpanded(true);
    setError(null);
  };

  const updateAlt = (alt: string) => {
    if (!media) return;
    onMediaChange({ ...media, alt });
  };

  const handlePixabaySearch = async (language: 'nb' | 'en') => {
    if (provider === 'upload') return;
    const query = pixabayQuery.trim();
    if (!roomId) {
      setError('Mangler quiz-id. Last redigeringssiden på nytt.');
      return;
    }
    if (query.length < 2) {
      setError('Skriv minst to tegn for å søke etter bilde.');
      return;
    }
    const session = getHostSession(roomId);
    if (!session) {
      setError(
        'Fant ikke quizmaster-økt. Gå tilbake til quizmaster-siden og åpne redigering på nytt.',
      );
      return;
    }

    setPixabayLoading(language);
    setError(null);
    setSearchNotice(null);
    setNoMoreResults(false);
    try {
      const response = await searchImageProvider(session, provider, query, language, 1);
      setResultPages(response.results.length > 0 ? [response.results] : []);
      setPageIndex(0);
      setResultsVisible(response.results.length > 0);
      setActiveSearch({ query, language, page: response.page, hasMore: response.hasMore });
      if (response.translatedQuery) {
        setSearchNotice(`Oversatt søk: ${response.translatedQuery}`);
      } else if (response.notice) {
        setSearchNotice(response.notice);
      }
      if (response.results.length === 0) {
        setError(
          provider === 'wikimedia'
            ? 'Fant ingen bilder på Wikimedia for dette søket.'
            : 'Fant ingen bilder på Pixabay for dette søket.',
        );
        setNoMoreResults(true);
      }
    } catch (err) {
      resetSearchResults();
      setError(
        err instanceof Error
          ? err.message
          : provider === 'wikimedia'
            ? 'Kunne ikke søke i Wikimedia Commons.'
            : 'Kunne ikke søke etter bilder.',
      );
    } finally {
      setPixabayLoading(null);
    }
  };

  const loadMorePixabayResults = async () => {
    if (provider === 'upload') return;
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
      const response = await searchImageProvider(
        session,
        provider,
        activeSearch.query,
        activeSearch.language,
        nextPage,
      );
      const seen = new Set(resultPages.flatMap((page) => page.map((item) => item.id)));
      const nextBatch = response.results.filter((item) => !seen.has(item.id));

      if (nextBatch.length === 0 && !response.hasMore) {
        setNoMoreResults(true);
        setActiveSearch({
          query: activeSearch.query,
          language: activeSearch.language,
          page: response.page,
          hasMore: false,
        });
        return;
      }

      setResultPages((pages) => {
        const next = nextBatch.length > 0 ? [...pages, nextBatch] : pages;
        setPageIndex(next.length - 1);
        return next;
      });
      setResultsVisible(true);
      setActiveSearch({
        query: activeSearch.query,
        language: activeSearch.language,
        page: response.page,
        hasMore: response.hasMore,
      });
      if (!response.hasMore) {
        setNoMoreResults(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste flere bilder.');
    } finally {
      setLoadingMore(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!roomId) {
      setError('Fant ikke quiz-id. Oppdater siden og prøv igjen.');
      return;
    }
    const lower = file.name.toLowerCase();
    const allowedExt =
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.webp');
    if (!allowedExt) {
      setError('Kun JPG, JPEG, PNG og WEBP er tillatt.');
      return;
    }
    if (file.size > 1_000_000) {
      setError('Bildet må være mindre enn 1 MB.');
      return;
    }
    if (!ownershipConfirmed) {
      setError('Du må bekrefte at du eier bildet eller har tillatelse til bruk.');
      return;
    }
    const session = getHostSession(roomId);
    if (!session) {
      setError('Fant ikke quizmaster-økt. Oppdater siden og prøv igjen.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const result = await uploadPrivateImage(session, file, ownershipConfirmed);
      onMediaChange(imageResultToMedia(result, 'upload'));
      setExpanded(false);
      resetSearchResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke laste opp bilde.');
    } finally {
      setUploading(false);
    }
  };

  const searchPanel = expanded ? (
    <div className="space-y-2 rounded-xl border border-quiz-border/60 bg-quiz-surface/40 p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={pixabayQuery}
          onChange={(e) => setPixabayQuery(e.target.value)}
          placeholder="Søk på norsk eller engelsk"
          className="text-sm"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="col-span-2 text-xs text-quiz-text font-semibold">Bildekilde</label>
        <label className="flex items-center gap-2 rounded-lg border border-quiz-border/60 bg-quiz-surface/60 px-2 py-1.5 text-xs">
          <input
            type="radio"
            name={`${label}-provider`}
            checked={provider === 'pixabay'}
            onChange={() => setProvider('pixabay')}
          />
          Pixabay
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-quiz-border/60 bg-quiz-surface/60 px-2 py-1.5 text-xs">
          <input
            type="radio"
            name={`${label}-provider`}
            checked={provider === 'wikimedia'}
            onChange={() => setProvider('wikimedia')}
          />
          Wikimedia Commons
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-quiz-border/60 bg-quiz-surface/60 px-2 py-1.5 text-xs">
          <input
            type="radio"
            name={`${label}-provider`}
            checked={provider === 'upload'}
            onChange={() => setProvider('upload')}
          />
          Last opp bilde
        </label>
      </div>
      {provider !== 'upload' ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => handlePixabaySearch('nb')}
            disabled={pixabayLoading !== null}
          >
            {pixabayLoading === 'nb' ? 'Søker…' : '🇳🇴 Søk'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => handlePixabaySearch('en')}
            disabled={pixabayLoading !== null}
          >
            {pixabayLoading === 'en' ? '…' : '🇬🇧 EN'}
          </Button>
        </div>
      ) : (
        <div
          className={`rounded-xl border border-dashed p-3 ${dragActive ? 'border-quiz-accent bg-quiz-accent/10' : 'border-quiz-border/70 bg-quiz-surface/40'}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
              void uploadFile(file);
            }
          }}
        >
          <p className="text-xs text-quiz-text font-semibold">Last opp bilde (JPG/PNG/WEBP, maks 1 MB)</p>
          <p className="mt-1 text-[11px] text-quiz-muted">Ikke last opp opphavsrettsbeskyttet materiale.</p>
          <label className="mt-3 flex items-start gap-2 text-xs text-quiz-text">
            <input
              type="checkbox"
              checked={ownershipConfirmed}
              onChange={(e) => setOwnershipConfirmed(e.target.checked)}
            />
            <span>Jeg bekrefter at jeg eier bildet eller har tillatelse til å bruke det i quizen.</span>
          </label>
          <div className="mt-3">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.currentTarget.value = '';
                if (file) {
                  void uploadFile(file);
                }
              }}
              className="block w-full text-xs text-quiz-muted file:mr-3 file:rounded-md file:border-0 file:bg-quiz-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              disabled={uploading}
            />
          </div>
          {uploading && <p className="mt-2 text-xs text-quiz-muted">Laster opp…</p>}
        </div>
      )}
      {searchNotice && <p className="text-xs text-quiz-muted break-words">{searchNotice}</p>}
      {provider !== 'upload' && totalPages > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setResultsVisible((current) => !current)}
            >
              {resultsVisible ? 'Skjul treff' : 'Vis treff'}
            </Button>
            {resultsVisible && totalPages > 1 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-quiz-muted">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pageIndex <= 0}
                  onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
                >
                  ← Forrige sett
                </Button>
                <span className="tabular-nums font-medium text-quiz-text">
                  Sett {pageIndex + 1} av {totalPages}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pageIndex >= totalPages - 1}
                  onClick={() => setPageIndex((index) => Math.min(totalPages - 1, index + 1))}
                >
                  Neste sett →
                </Button>
              </div>
            )}
          </div>
          {resultsVisible && (
            <>
              <p className="text-[11px] text-quiz-muted">
                Klikk et bilde for å bruke det med én gang. Bruk «Bytt bilde» for å søke på nytt.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {currentResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    title="Bruk dette bildet"
                    className={`min-w-0 rounded-lg border p-1.5 text-left transition-colors hover:border-quiz-accent hover:ring-2 hover:ring-quiz-accent/30 ${
                      media?.url === result.imageUrl
                        ? 'border-quiz-accent bg-quiz-accent/10 ring-2 ring-quiz-accent/40'
                        : 'border-quiz-border bg-quiz-bg'
                    }`}
                    onClick={() => attachPixabay(result)}
                  >
                    <img
                      src={result.previewUrl || result.imageUrl}
                      alt={result.tags}
                      className="mx-auto h-14 w-full rounded object-cover sm:h-16"
                    />
                  </button>
                ))}
              </div>
            </>
          )}
          {resultsVisible && onLatestPage && activeSearch && !noMoreResults && activeSearch.hasMore && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={loadMorePixabayResults}
              disabled={loadingMore}
            >
              {loadingMore ? 'Laster…' : 'Flere bilder (nytt sett)'}
            </Button>
          )}
          {resultsVisible && onLatestPage && noMoreResults && totalPages > 0 && (
            <p className="text-center text-[11px] text-quiz-muted">Ingen flere bilder for dette søket.</p>
          )}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div
      className={`space-y-2 min-w-0 max-w-full ${compact ? '' : 'rounded-lg border border-quiz-border/60 bg-quiz-bg/50 p-3'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-quiz-muted">{label}</p>
        {!embeddedInModal && (media || expanded) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setExpanded((open) => !open);
              if (!expanded) {
                setResultsVisible(totalPages > 0);
              }
            }}
          >
            {expanded ? 'Skjul søk' : media ? 'Bytt bilde' : 'Lukk'}
          </Button>
        )}
        {embeddedInModal && media && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setExpanded(true);
              setResultsVisible(totalPages > 0);
            }}
          >
            Bytt bilde
          </Button>
        )}
      </div>
      {hint && <p className="text-xs text-quiz-muted leading-relaxed">{hint}</p>}

      {media ? (
        <div className="flex flex-wrap items-start gap-3">
          <ChoiceMediaDisplay media={media} variant="editor-preview" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="rounded-lg border border-quiz-border/60 bg-quiz-surface/50 px-2 py-1.5 text-[11px] text-quiz-muted">
              {(media.photographer || media.creator) && (
                <p>📷 Foto: {media.photographer || media.creator}</p>
              )}
              {media.license && <p>📄 Lisens: {media.license}</p>}
              {media.pageUrl && (
                <p>
                  🔗{' '}
                  <a
                    href={media.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    {media.source === 'wikimedia'
                      ? 'Wikimedia Commons'
                      : media.source === 'upload'
                        ? 'Privat bilde'
                        : 'Kilde'}
                  </a>
                </p>
              )}
            </div>
            <Input
              value={media.alt ?? ''}
              onChange={(e) => updateAlt(e.target.value)}
              placeholder="Kort beskrivelse (alt-tekst)"
              className="text-sm"
            />
            <Button type="button" variant="ghost" size="sm" onClick={removeImage}>
              Fjern bilde
            </Button>
          </div>
        </div>
      ) : expanded ? (
        <p className="text-xs text-quiz-muted">
          Søk og klikk et bilde i trefflisten for å legge det inn med én gang.
        </p>
      ) : (
        <Button type="button" variant="secondary" size="sm" onClick={() => setExpanded(true)}>
          Åpne bildesøk
        </Button>
      )}

      {searchPanel}
      {error && (
        <p className="text-xs text-red-800 break-words" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
