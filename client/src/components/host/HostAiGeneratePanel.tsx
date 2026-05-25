import { useState } from 'react';
import {
  AI_GENERATE_QUESTION_MAX,
  AI_GENERATE_QUESTION_MIN,
  AI_QUIZ_CUSTOM_THEME,
  AI_QUIZ_QUESTION_COUNT_OPTIONS,
  AI_QUIZ_THEME_PRESETS,
  type AiQuizDifficulty,
  type AiQuizQuestionStyle,
  type Question,
} from '@quiz-tool/shared';
import { requestAiQuizGeneration } from '../../lib/aiQuizApi';
import { getHostSession } from '../../lib/tokens';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const DIFFICULTY_OPTIONS: { value: AiQuizDifficulty; label: string }[] = [
  { value: 'easy', label: 'Lett' },
  { value: 'medium', label: 'Middels' },
  { value: 'hard', label: 'Vanskelig' },
];

const STYLE_OPTIONS: { value: AiQuizQuestionStyle; label: string }[] = [
  { value: 'open', label: 'Åpne spørsmål' },
  { value: 'mc', label: 'Flervalg' },
  { value: 'mixed', label: 'Blandet' },
];

const LOADING_STEPS = [
  'Finner gode vinkler',
  'Skriver spørsmål',
  'Sjekker fasit',
  'Stokker flervalgsalternativer',
];

const selectClassName =
  'box-border w-full min-w-0 max-w-full rounded-xl border border-quiz-border bg-quiz-surface-elevated px-4 py-3 text-sm text-quiz-text focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-quiz-accent min-h-[44px]';

interface HostAiGeneratePanelProps {
  roomId: string;
  onGenerated: (questions: Omit<Question, 'id' | 'order'>[]) => void;
}

export function HostAiGeneratePanel({ roomId, onGenerated }: HostAiGeneratePanelProps) {
  const [themePreset, setThemePreset] = useState<string>(AI_QUIZ_THEME_PRESETS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<AiQuizDifficulty>('medium');
  const [questionStyle, setQuestionStyle] = useState<AiQuizQuestionStyle>('mixed');
  const [includePixabayImages, setIncludePixabayImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustomTheme = themePreset === AI_QUIZ_CUSTOM_THEME;
  const topic = isCustomTheme ? customTopic.trim() : themePreset;

  const handleGenerate = async () => {
    setError(null);
    if (!topic) {
      setError('Velg tema eller skriv et egendefinert tema.');
      return;
    }

    const session = getHostSession(roomId);
    if (!session) {
      setError('Fant ikke quizmaster-økt. Gå tilbake og opprett quizen på nytt.');
      return;
    }

    setLoading(true);
    try {
      const varietySeed =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const result = await requestAiQuizGeneration(session, {
        topic,
        questionCount,
        difficulty,
        questionStyle,
        includePixabayImages,
        varietySeed,
      });
      onGenerated(result.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke generere quiz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-2xl border border-quiz-border/60 bg-quiz-bg/50 p-4 sm:p-6 space-y-5 min-w-0 max-w-full overflow-hidden box-border"
      aria-busy={loading}
    >
      <div>
        <h2 className="text-lg font-semibold text-quiz-text">Generer med AI</h2>
        <p className="mt-1 text-sm text-quiz-muted break-words">
          Hver generering får nye vinkler og unngår typiske gjengangere. Rediger gjerne i editoren
          før du lagrer og presenterer.
        </p>
      </div>

      <div className="space-y-4 min-w-0">
        <div className="min-w-0">
          <label htmlFor="ai-theme-preset" className="text-xs text-quiz-muted mb-1 block">
            Tema
          </label>
          <select
            id="ai-theme-preset"
            value={themePreset}
            onChange={(e) => setThemePreset(e.target.value)}
            className={selectClassName}
            disabled={loading}
          >
            {AI_QUIZ_THEME_PRESETS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value={AI_QUIZ_CUSTOM_THEME}>{AI_QUIZ_CUSTOM_THEME}</option>
          </select>
        </div>

        {isCustomTheme && (
          <div className="min-w-0">
            <label htmlFor="ai-custom-topic" className="text-xs text-quiz-muted mb-1 block">
              Egendefinert tema
            </label>
            <Input
              id="ai-custom-topic"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="F.eks. Oslo på 1800-tallet"
              className="text-sm"
              disabled={loading}
            />
          </div>
        )}

        <div className="min-w-0">
          <span className="text-xs text-quiz-muted mb-2 block">
            Antall spørsmål ({AI_GENERATE_QUESTION_MIN}–{AI_GENERATE_QUESTION_MAX})
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Antall spørsmål">
            {AI_QUIZ_QUESTION_COUNT_OPTIONS.map((n) => (
              <Button
                key={n}
                type="button"
                size="sm"
                variant={questionCount === n ? 'primary' : 'secondary'}
                className="min-w-[2.75rem] px-0"
                disabled={loading}
                aria-pressed={questionCount === n}
                onClick={() => setQuestionCount(n)}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 min-w-0">
          <div className="min-w-0">
            <label htmlFor="ai-difficulty" className="text-xs text-quiz-muted mb-1 block">
              Vanskelighetsgrad
            </label>
            <select
              id="ai-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as AiQuizDifficulty)}
              className={selectClassName}
              disabled={loading}
            >
              {DIFFICULTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="ai-style" className="text-xs text-quiz-muted mb-1 block">
              Spørsmålstype
            </label>
            <select
              id="ai-style"
              value={questionStyle}
              onChange={(e) => setQuestionStyle(e.target.value as AiQuizQuestionStyle)}
              className={selectClassName}
              disabled={loading}
            >
              {STYLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-quiz-border bg-quiz-surface-elevated/60 p-3">
          <input
            type="checkbox"
            checked={includePixabayImages}
            onChange={(e) => setIncludePixabayImages(e.target.checked)}
            disabled={loading}
            className="mt-1 h-4 w-4 shrink-0 accent-quiz-accent"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-quiz-text">
              Finn relevante bilder fra Pixabay
            </span>
            <span className="mt-1 block text-xs text-quiz-muted">
              AI prøver å legge ved ett bilde per spørsmål. Du kan fjerne eller bytte bilde etterpå.
            </span>
          </span>
        </label>
      </div>

      <Button
        type="button"
        className="w-full sm:w-auto"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
              aria-hidden
            />
            Genererer quiz…
          </span>
        ) : (
          'Generer quiz'
        )}
      </Button>

      {loading && (
        <div
          className="rounded-2xl border border-quiz-accent/40 bg-quiz-accent/10 p-4 sm:p-5 overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
              <span className="absolute h-full w-full rounded-full border border-quiz-accent/30 animate-ping" />
              <span className="absolute h-11 w-11 rounded-full border-4 border-quiz-accent/20 border-t-quiz-accent animate-spin" />
              <span className="relative h-3 w-3 rounded-full bg-quiz-accent shadow-[0_0_18px_rgba(124,58,237,0.85)]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-quiz-text">
                AI lager {questionCount} spørsmål om {topic}
              </p>
              <p className="mt-1 text-xs text-quiz-muted">
                {includePixabayImages
                  ? 'Dette kan ta litt ekstra tid når bilder hentes. Ikke lukk siden.'
                  : 'Dette kan ta opptil et halvt minutt. Ikke lukk siden.'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(includePixabayImages
              ? [...LOADING_STEPS, 'Finner relevante bilder']
              : LOADING_STEPS
            ).map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-2 rounded-xl border border-quiz-border/50 bg-quiz-bg/40 px-3 py-2"
              >
                <span
                  className="h-2 w-2 rounded-full bg-quiz-accent animate-pulse"
                  style={{ animationDelay: `${index * 180}ms` }}
                  aria-hidden
                />
                <span className="text-xs text-quiz-muted">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 break-words" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
