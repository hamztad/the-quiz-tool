import { useMemo, useState } from 'react';
import {
  AI_GENERATE_QUESTION_MAX,
  AI_GENERATE_QUESTION_MIN,
  AI_QUIZ_CUSTOM_THEME,
  AI_QUIZ_THEME_PRESETS,
  AI_SHOP_INSTANT_QUESTION_COUNT,
  builtInGames,
  cartSlotsFromCounts,
  getBuiltInGame,
  QUIZ_PACKAGE_PRESET_SLOTS,
  type AiImageProvider,
  type AiQuizDifficulty,
  type AiShopSlot,
  type GameId,
  type Question,
} from '@quiz-tool/shared';
import { requestAiQuizGeneration } from '../../lib/aiQuizApi';
import { getHostSession } from '../../lib/tokens';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

type WizardStep = 'choosePath' | 'buildCart' | 'cartReady' | 'theme' | 'generating';

const DIFFICULTY_OPTIONS: { value: AiQuizDifficulty; label: string }[] = [
  { value: 'easy', label: 'Lett' },
  { value: 'medium', label: 'Middels' },
  { value: 'hard', label: 'Vanskelig' },
];

const LOADING_STEPS = [
  'Finner gode vinkler',
  'Skriver oppgaver',
  'Validerer format',
  'Stokker flervalgsalternativer',
];

const CART_GAMES = builtInGames.filter((g) => g.id !== 'revealImage');

const selectClassName =
  'box-border w-full min-w-0 max-w-full rounded-xl border border-quiz-border bg-quiz-surface-elevated px-4 py-3 text-sm text-quiz-text focus:border-quiz-accent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-quiz-accent min-h-[44px]';

interface CartCounts {
  open: number;
  mc: number;
  ordering: number;
  gameIds: GameId[];
}

const EMPTY_CART: CartCounts = { open: 0, mc: 0, ordering: 0, gameIds: [] };

function cartTotal(counts: CartCounts): number {
  return counts.open + counts.mc + counts.ordering + counts.gameIds.length;
}

function slotsFromCounts(counts: CartCounts): AiShopSlot[] {
  return cartSlotsFromCounts({
    open: counts.open,
    mc: counts.mc,
    ordering: counts.ordering,
    games: counts.gameIds.map((gameId) => ({ gameId })),
  });
}

function countsFromPreset(slots: AiShopSlot[]): CartCounts {
  return {
    open: slots.filter((s) => s.type === 'open').length,
    mc: slots.filter((s) => s.type === 'mc').length,
    ordering: slots.filter((s) => s.type === 'ordering').length,
    gameIds: slots
      .filter((s) => s.type === 'game' && s.gameId)
      .map((s) => s.gameId!),
  };
}

interface AiShopWizardProps {
  roomId: string;
  onGenerated: (questions: Omit<Question, 'id' | 'order'>[]) => void;
}

export function AiShopWizard({ roomId, onGenerated }: AiShopWizardProps) {
  const [step, setStep] = useState<WizardStep>('choosePath');
  const [cart, setCart] = useState<CartCounts>(EMPTY_CART);
  const [themePreset, setThemePreset] = useState<string>(AI_QUIZ_THEME_PRESETS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState<AiQuizDifficulty>('medium');
  const [includePixabayImages, setIncludePixabayImages] = useState(false);
  const [imageProvider, setImageProvider] = useState<AiImageProvider>('pixabay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);

  const total = cartTotal(cart);
  const isCustomTheme = themePreset === AI_QUIZ_CUSTOM_THEME;
  const topic = isCustomTheme ? customTopic.trim() : themePreset;

  const gameSlotsInCart = useMemo(
    () => cart.gameIds.map((id) => getBuiltInGame(id)).filter(Boolean),
    [cart.gameIds],
  );

  const adjust = (key: 'open' | 'mc' | 'ordering', delta: number) => {
    setCart((prev) => {
      const next = { ...prev, [key]: Math.max(0, prev[key] + delta) };
      if (cartTotal(next) > AI_GENERATE_QUESTION_MAX) return prev;
      return next;
    });
  };

  const addGame = (gameId: GameId) => {
    setCart((prev) => {
      if (cartTotal(prev) >= AI_GENERATE_QUESTION_MAX) return prev;
      return { ...prev, gameIds: [...prev.gameIds, gameId] };
    });
    setGamePickerOpen(false);
  };

  const removeGameAt = (index: number) => {
    setCart((prev) => ({
      ...prev,
      gameIds: prev.gameIds.filter((_, i) => i !== index),
    }));
  };

  const runGenerate = async (mode: 'instant' | 'cart', cartTopic: string) => {
    setError(null);
    const session = getHostSession(roomId);
    if (!session) {
      setError('Fant ikke Gruizmaster-økt. Gå tilbake og opprett Gruizen på nytt.');
      return;
    }

    const slots = mode === 'cart' ? slotsFromCounts(cart) : undefined;
    const questionCount = mode === 'instant' ? AI_SHOP_INSTANT_QUESTION_COUNT : total;

    if (mode === 'cart' && (total < AI_GENERATE_QUESTION_MIN || !cartTopic)) {
      setError(
        !cartTopic
          ? 'Velg tema eller bruk «Lag Gruiz» uten tema-steg (bruker Allmennkunnskap).'
          : `Kurven må ha minst ${AI_GENERATE_QUESTION_MIN} oppgaver.`,
      );
      return;
    }

    setStep('generating');
    setLoading(true);
    try {
      const varietySeed =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const result = await requestAiQuizGeneration(session, {
        mode,
        topic: mode === 'instant' ? '' : cartTopic,
        questionCount,
        difficulty,
        slots,
        includePixabayImages: mode === 'cart' ? includePixabayImages : false,
        imageProvider,
        varietySeed,
      });
      onGenerated(result.questions);
      setStep('choosePath');
      setCart(EMPTY_CART);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke generere Gruiz.');
      setStep(mode === 'instant' ? 'choosePath' : 'cartReady');
    } finally {
      setLoading(false);
    }
  };

  const cartBlock = (
    <div className="space-y-4 rounded-xl border border-quiz-border/60 bg-quiz-surface/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-quiz-text">
          Oppgaver i kurv: {total} / {AI_GENERATE_QUESTION_MAX}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCart(countsFromPreset(QUIZ_PACKAGE_PRESET_SLOTS))}
          disabled={loading}
        >
          Standardpakke (5)
        </Button>
      </div>

      {(['open', 'mc', 'ordering'] as const).map((key) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <span className="text-sm text-quiz-text capitalize">
            {key === 'open' ? 'Åpne' : key === 'mc' ? 'Flervalg' : 'Rekkefølge'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-w-[2.5rem]"
              onClick={() => adjust(key, -1)}
              disabled={cart[key] === 0 || loading}
              aria-label={`Fjern ${key}`}
            >
              −
            </Button>
            <span className="w-8 text-center font-bold tabular-nums">{cart[key]}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-w-[2.5rem]"
              onClick={() => adjust(key, 1)}
              disabled={total >= AI_GENERATE_QUESTION_MAX || loading}
              aria-label={`Legg til ${key}`}
            >
              +
            </Button>
          </div>
        </div>
      ))}

      <div className="space-y-2 border-t border-quiz-border/40 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-quiz-text">Spill</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setGamePickerOpen((v) => !v)}
            disabled={total >= AI_GENERATE_QUESTION_MAX || loading}
          >
            + Spill
          </Button>
        </div>
        {gamePickerOpen && (
          <div className="grid gap-2 sm:grid-cols-2">
            {CART_GAMES.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => addGame(game.id)}
                className="rounded-xl border border-quiz-border bg-quiz-surface-elevated px-3 py-2 text-left text-sm hover:border-quiz-accent"
              >
                <span className="font-bold text-quiz-text">{game.label}</span>
              </button>
            ))}
          </div>
        )}
        {cart.gameIds.map((id, index) => {
          const label = getBuiltInGame(id)?.label ?? id;
          return (
            <div
              key={`${id}-${index}`}
              className="flex items-center justify-between rounded-lg border border-quiz-border/50 px-3 py-2 text-sm"
            >
              <span>{label}</span>
              <button
                type="button"
                className="text-quiz-muted hover:text-red-500"
                onClick={() => removeGameAt(index)}
              >
                Fjern
              </button>
            </div>
          );
        })}
      </div>

      {total < AI_GENERATE_QUESTION_MIN && (
        <p className="text-xs text-amber-800">
          Legg til minst {AI_GENERATE_QUESTION_MIN} oppgaver for å fortsette.
        </p>
      )}
    </div>
  );

  const themeBlock = (
    <div className="space-y-4 min-w-0">
      <div className="min-w-0">
        <label htmlFor="ai-shop-theme" className="text-xs text-quiz-muted mb-1 block">
          Tema for alle oppgaver
        </label>
        <select
          id="ai-shop-theme"
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
        <Input
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          placeholder="F.eks. Norsk geografi"
          disabled={loading}
        />
      )}
      <div className="min-w-0">
        <label htmlFor="ai-shop-difficulty" className="text-xs text-quiz-muted mb-1 block">
          Vanskelighetsgrad
        </label>
        <select
          id="ai-shop-difficulty"
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
      {gameSlotsInCart.length > 0 && (
        <p className="text-xs text-quiz-muted rounded-lg border border-quiz-border/50 bg-quiz-bg/50 p-3">
          Spill i kurven får standardoppsett. Juster gjerne spillinnstillinger i editoren etter
          generering.
        </p>
      )}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-quiz-border bg-quiz-surface-elevated/60 p-3">
        <input
          type="checkbox"
          checked={includePixabayImages}
          onChange={(e) => setIncludePixabayImages(e.target.checked)}
          disabled={loading}
          className="mt-1 h-5 w-5 accent-quiz-accent"
        />
        <span className="text-sm text-quiz-muted">Finn relevante bilder automatisk (åpent/MC)</span>
      </label>
      {includePixabayImages && (
        <div className="flex flex-wrap gap-2 text-xs">
          <label className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5">
            <input
              type="radio"
              checked={imageProvider === 'pixabay'}
              onChange={() => setImageProvider('pixabay')}
            />
            Pixabay
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5">
            <input
              type="radio"
              checked={imageProvider === 'wikimedia'}
              onChange={() => setImageProvider('wikimedia')}
            />
            Wikimedia
          </label>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="rounded-2xl border border-quiz-border/60 bg-quiz-bg/50 p-4 sm:p-6 space-y-5 min-w-0 max-w-full overflow-hidden box-border"
      aria-busy={loading}
    >
      <div>
        <h2 className="text-lg font-semibold text-quiz-text">AI-shop</h2>
        <p className="mt-1 text-sm text-quiz-muted break-words">
          Lag en Gruiz med KI. Sjekk fasit i editoren etterpå — særlig rekkefølge og åpne svar.
        </p>
      </div>

      {step === 'choosePath' && (
        <div className="space-y-3">
          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={() => void runGenerate('instant', '')}
          >
            Lag Gruiz
          </Button>
          <p className="text-xs text-center text-quiz-muted">
            10 varierte oppgaver — tema velges automatisk
          </p>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={loading}
            onClick={() => setStep('buildCart')}
          >
            Velg oppgavetyper og spill
          </Button>
        </div>
      )}

      {step === 'buildCart' && (
        <div className="space-y-4">
          {cartBlock}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep('choosePath')}>
              Tilbake
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={total < AI_GENERATE_QUESTION_MIN}
              onClick={() => setStep('cartReady')}
            >
              Neste
            </Button>
          </div>
        </div>
      )}

      {step === 'cartReady' && (
        <div className="space-y-4">
          <p className="text-sm text-quiz-muted">
            {total} oppgaver i kurven. Du kan gå tilbake og justere.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="flex-1"
              disabled={loading}
              onClick={() => void runGenerate('cart', 'Allmennkunnskap')}
            >
              Lag Gruiz
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setStep('theme')}
            >
              Velg tema
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep('buildCart')}>
            Tilbake
          </Button>
        </div>
      )}

      {step === 'theme' && (
        <div className="space-y-4">
          {themeBlock}
          <Button
            type="button"
            className="w-full"
            disabled={loading || !topic}
            onClick={() => void runGenerate('cart', topic)}
          >
            Lag Gruiz
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep('cartReady')}>
            Tilbake
          </Button>
        </div>
      )}

      {step === 'generating' && loading && (
        <div className="rounded-2xl border border-quiz-accent/40 bg-quiz-accent/10 p-4" role="status">
          <p className="text-sm font-semibold text-quiz-text">Bygger Gruiz…</p>
          <p className="mt-1 text-xs text-quiz-muted">Dette kan ta opptil et halvt minutt.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {LOADING_STEPS.map((label, index) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border border-quiz-border/50 bg-quiz-bg/40 px-3 py-2 text-xs text-quiz-muted"
              >
                <span
                  className="h-2 w-2 rounded-full bg-quiz-accent animate-pulse"
                  style={{ animationDelay: `${index * 180}ms` }}
                />
                {label}
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
