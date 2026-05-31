import { useState } from 'react';
import type { Question } from '@quiz-tool/shared';
import { questionHasImageMedia } from '@quiz-tool/shared';
import {
  attachImagesToQuizQuestions,
  countQuestionsEligibleForImageAttach,
} from '../../lib/attachQuizQuestionImages';
import type { SearchImageProvider } from '../../lib/pixabayApi';
import type { HostSession } from '../../lib/tokens';
import { Button } from '../ui/Button';

interface AttachQuizImagesPanelProps {
  questions: Question[];
  hostSession: HostSession | null;
  onQuestionsChange: (questions: Question[]) => void;
  onStatusMessage?: (message: string | null) => void;
  onErrors?: (errors: string[]) => void;
  variant?: 'tekst' | 'editor';
}

export function AttachQuizImagesPanel({
  questions,
  hostSession,
  onQuestionsChange,
  onStatusMessage,
  onErrors,
  variant = 'tekst',
}: AttachQuizImagesPanelProps) {
  const [imageProvider, setImageProvider] = useState<SearchImageProvider>('pixabay');
  const [onlyArpMarked, setOnlyArpMarked] = useState(variant === 'tekst');
  const [attachingImages, setAttachingImages] = useState(false);

  const arpPending = questions.filter(
    (q) => Boolean(q.autoImageProvider) && !questionHasImageMedia(q),
  ).length;

  const eligibleAll = countQuestionsEligibleForImageAttach(questions, false);
  const eligibleMarked = countQuestionsEligibleForImageAttach(questions, true);
  const eligibleCount = onlyArpMarked ? eligibleMarked : eligibleAll;

  if (eligibleAll === 0 && arpPending === 0) return null;

  const runAttachImages = async () => {
    if (!hostSession) {
      onStatusMessage?.('Koble til Gruizen på nytt for å søke etter bilder.');
      return;
    }
    if (eligibleCount === 0) {
      onStatusMessage?.(
        onlyArpMarked
          ? 'Ingen ARP-merkede oppgaver uten bilde. Bruk ARP-P eller ARP-W på egen linje i teksten.'
          : 'Ingen oppgaver uten bilde å hente bilder til.',
      );
      return;
    }
    setAttachingImages(true);
    onStatusMessage?.(null);
    onErrors?.([]);
    try {
      const result = await attachImagesToQuizQuestions(hostSession, questions, {
        defaultProvider: imageProvider,
        onlyMarked: onlyArpMarked,
      });
      onQuestionsChange(result.questions);
      if (result.errors.length > 0) {
        onErrors?.(result.errors);
      }
      onStatusMessage?.(
        result.attached > 0
          ? `La til bilde på ${result.attached} oppgaver` +
              (result.failed > 0 ? ` · ${result.failed} feilet` : '') +
              (result.skipped > 0 ? ` · ${result.skipped} hoppet over` : '') +
              '.'
          : result.failed > 0
            ? 'Ingen bilder ble lagt til — se feilmeldingene.'
            : 'Ingen oppgaver trengte bilder.',
      );
    } catch (err) {
      onStatusMessage?.(err instanceof Error ? err.message : 'Kunne ikke hente bilder.');
    } finally {
      setAttachingImages(false);
    }
  };

  const borderClass =
    variant === 'editor'
      ? 'border-amber-400/70 bg-gradient-to-br from-amber-50 to-orange-50/80'
      : 'border-cyan-300/50 bg-gradient-to-br from-cyan-50/80 to-white';

  return (
    <div className={`rounded-2xl border-2 p-4 space-y-3 min-w-0 ${borderClass}`}>
      <div>
        <p className={`text-sm font-bold ${variant === 'editor' ? 'text-amber-950' : 'text-cyan-950'}`}>
          {arpPending > 0
            ? `${arpPending} ARP-merkede oppgaver venter på bilde`
            : 'Legg til relevante bilder'}
        </p>
        <p className={`mt-1 text-xs leading-relaxed ${variant === 'editor' ? 'text-amber-900' : 'text-cyan-900'}`}>
          {variant === 'editor' && arpPending > 0
            ? 'Du importerte med ARP-P / ARP-W — trykk for å hente bilder. '
            : null}
          Søker ut fra spørsmålstekst (og riktig svar på MC, eller spillnavn på GAME). ARP-P / ARP-W må stå
          på egen linje (f.eks. mellom spørsmål og svar).
        </p>
      </div>
      <div className={`flex flex-wrap gap-4 text-sm ${variant === 'editor' ? 'text-amber-950' : 'text-cyan-950'}`}>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`quiz-image-provider-${variant}`}
            checked={imageProvider === 'pixabay'}
            onChange={() => setImageProvider('pixabay')}
          />
          Pixabay
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`quiz-image-provider-${variant}`}
            checked={imageProvider === 'wikimedia'}
            onChange={() => setImageProvider('wikimedia')}
          />
          Wikimedia
        </label>
      </div>
      <label
        className={`flex items-start gap-2 text-xs cursor-pointer ${variant === 'editor' ? 'text-amber-900' : 'text-cyan-900'}`}
      >
        <input
          type="checkbox"
          className="mt-0.5"
          checked={onlyArpMarked}
          onChange={(e) => setOnlyArpMarked(e.target.checked)}
        />
        <span>
          Kun oppgaver merket med ARP-P / ARP-W i teksten
          {eligibleMarked > 0 ? ` (${eligibleMarked} stk.)` : ''}
        </span>
      </label>
      <Button
        type="button"
        variant={variant === 'editor' && arpPending > 0 ? 'cta' : 'secondary'}
        className="w-full sm:w-auto"
        disabled={attachingImages || eligibleCount === 0 || !hostSession}
        onClick={() => void runAttachImages()}
      >
        {attachingImages
          ? 'Henter bilder…'
          : `Hent bilder (${eligibleCount} oppgaver)`}
      </Button>
    </div>
  );
}
