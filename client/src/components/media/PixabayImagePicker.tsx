import { useEffect, useState } from 'react';
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
  label?: string;
  hint?: string;
}

export function PixabayImagePicker({
  roomId,
  media,
  onMediaChange,
  compact = false,
  label = 'Bilde fra Pixabay',
  hint,
}: PixabayImagePickerProps) {
  const [provider, setProvider] = useState<ImageProvider>(media?.source ?? 'pixabay');
  const [expanded, setExpanded] = useState(!media);
  const [error, setError] = useState<string | null>(null);
  const [pixabayQuery, setPixabayQuery] = useState('');
  const [pixabayLoading, setPixabayLoading] = useState<'nb' | 'en' | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pixabayResults, setPixabayResults] = useState<ImageSearchResult[]>([]);
  const [selectedPixabayResult, setSelectedPixabayResult] = useState<ImageSearchResult | null>(null);
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

  useEffect(() => {
    if (media?.source === 'pixabay' || media?.source === 'wikimedia' || media?.source === 'upload') {
      setProvider(media.source);
    }
  }, [media?.source]);

  const attachPixabay = (result: ImageSearchResult) => {
    onMediaChange(imageResultToMedia(result, provider));
    setResultsVisible(false);
    setExpanded(false);
    setSelectedPixabayResult(null);
    setError(null);
  };

  const removeImage = () => {
    onMediaChange(undefined);
    setPixabayResults([]);
    setSelectedPixabayResult(null);
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
    setSelectedPixabayResult(null);
    try {
      const response = await searchImageProvider(session, provider, query, language, 1);
      setPixabayResults(response.results);
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
            ? 'No Wikimedia images found for this search.'
            : 'Fant ingen bilder på Pixabay for dette søket.',
        );
        setNoMoreResults(true);
      }
    } catch (err) {
      setPixabayResults([]);
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
      setPixabayResults((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...response.results.filter((item) => !seen.has(item.id))];
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
      setError('Image must be smaller than 1 MB.');
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
      setResultsVisible(false);
      setSelectedPixabayResult(null);
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
          Upload image
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
          <p className="text-xs text-quiz-text font-semibold">Upload image (JPG/JPEG/PNG/WEBP, max 1 MB)</p>
          <p className="mt-1 text-[11px] text-quiz-muted">Do not upload copyrighted or illegal material.</p>
          <label className="mt-3 flex items-start gap-2 text-xs text-quiz-text">
            <input
              type="checkbox"
              checked={ownershipConfirmed}
              onChange={(e) => setOwnershipConfirmed(e.target.checked)}
            />
            <span>I confirm that I own this image or have permission to use it in this quiz.</span>
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
      {provider !== 'upload' && pixabayResults.length > 0 && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setResultsVisible((current) => !current)}
          >
            {resultsVisible ? 'Skjul treff' : `Vis ${pixabayResults.length} treff`}
          </Button>
          {resultsVisible && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {pixabayResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className={`min-w-0 rounded-lg border p-1.5 text-left hover:border-quiz-accent ${
                    selectedPixabayResult?.id === result.id || media?.url === result.imageUrl
                      ? 'border-quiz-accent bg-quiz-accent/10'
                      : 'border-quiz-border bg-quiz-bg'
                  }`}
                  onClick={() => setSelectedPixabayResult(result)}
                >
                  <img
                    src={result.previewUrl || result.imageUrl}
                    alt={result.tags}
                    className="mx-auto h-14 w-full rounded object-cover sm:h-16"
                  />
                </button>
              ))}
            </div>
          )}
          {resultsVisible && selectedPixabayResult && (
            <div className="rounded-xl border border-quiz-accent/40 bg-quiz-accent/10 p-2">
              <p className="mb-2 text-xs font-semibold text-quiz-text">Valgt bilde</p>
              <div className="flex flex-wrap items-center gap-2">
                <img
                  src={selectedPixabayResult.previewUrl || selectedPixabayResult.imageUrl}
                  alt={selectedPixabayResult.tags}
                  className="h-14 w-20 rounded object-cover"
                />
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  onClick={() => attachPixabay(selectedPixabayResult)}
                >
                  + Legg til bilde
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-quiz-muted">
                📄 {provider === 'wikimedia' ? 'Wikimedia Commons' : 'Pixabay'}
              </p>
            </div>
          )}
          {resultsVisible && activeSearch && !noMoreResults && activeSearch.hasMore && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={loadMorePixabayResults}
              disabled={loadingMore}
            >
              {loadingMore ? 'Laster…' : 'Flere bilder'}
            </Button>
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
        {media && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? 'Skjul søk' : 'Bytt bilde'}
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
                    {media.source === 'wikimedia' ? 'Wikimedia Commons' : media.source === 'upload' ? 'Privat bilde' : 'Kilde'}
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
      ) : (
        <p className="text-xs text-quiz-muted">
          Velg et bilde fra trefflisten, eller bytt kilde til Upload image for privat opplasting.
        </p>
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
