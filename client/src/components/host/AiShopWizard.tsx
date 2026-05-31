import { useMemo, useState } from 'react';
import {
  AI_GENERATE_QUESTION_MAX,
  AI_GENERATE_QUESTION_MIN,
  AI_QUIZ_CUSTOM_THEME,
  AI_QUIZ_THEME_PRESETS,
  AI_SHOP_INSTANT_QUESTION_COUNT,
  AI_SHOP_ORDERING_DEFAULT_ITEMS,
  AI_SHOP_ORDERING_MAX_ITEMS,
  AI_SHOP_ORDERING_MIN_ITEMS,
  builtInGames,
  cartSlotsFromCounts,
  clampOrderingItemCount,
  getBuiltInGame,
  QUIZ_PACKAGE_PRESET_SLOTS,
  type AiImageProvider,
  type AiQuizDifficulty,
  type AiShopTypeThemes,
  type GameId,
  type Question,
} from '@quiz-tool/shared';
import { requestAiQuizGeneration } from '../../lib/aiQuizApi';
import { getHostSession } from '../../lib/tokens';
import { AiShopGeneratingPanel } from './AiShopGeneratingPanel';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

type WizardStep = 'choosePath' | 'buildCart' | 'cartReady' | 'theme' | 'generating';

type CartKey = 'open' | 'mc' | 'ordering';

type TypeThemeField = { preset: string; custom: string };

const DIFFICULTY_OPTIONS: { value: AiQuizDifficulty; label: string }[] = [
  { value: 'easy', label: 'Lett' },
  { value: 'medium', label: 'Middels' },
  { value: 'hard', label: 'Vanskelig' },
];

const LOADING_STEPS = [
  { emoji: '💡', label: 'Finner gode vinkler' },
  { emoji: '✍️', label: 'Skriver oppgaver' },
  { emoji: '✅', label: 'Validerer format' },
  { emoji: '🎲', label: 'Stokker flervalgsalternativer' },
];

const CART_GAMES = builtInGames.filter((g) => g.id !== 'revealImage');

const TYPE_META: Record<CartKey, { emoji: string; label: string }> = {
  open: { emoji: '✍️', label: 'Åpne' },
  mc: { emoji: '🔘', label: 'Flervalg' },
  ordering: { emoji: '↕️', label: 'Rekkefølge' },
};

const DEFAULT_TYPE_THEME: TypeThemeField = {
  preset: AI_QUIZ_THEME_PRESETS[0],
  custom: '',
};

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

function resolveThemeField(field: TypeThemeField): string {
  if (field.preset === AI_QUIZ_CUSTOM_THEME) {
    return field.custom.trim() || AI_QUIZ_THEME_PRESETS[0];
  }
  return field.preset;
}

function buildTypeThemes(
  cart: CartCounts,
  fields: Record<CartKey, TypeThemeField>,
): AiShopTypeThemes {
  const themes: AiShopTypeThemes = {};
  if (cart.open > 0) themes.open = resolveThemeField(fields.open);
  if (cart.mc > 0) themes.mc = resolveThemeField(fields.mc);
  if (cart.ordering > 0) themes.ordering = resolveThemeField(fields.ordering);
  return themes;
}

interface AiShopWizardProps {
  roomId: string;
  onGenerated: (questions: Omit<Question, 'id' | 'order'>[]) => void;
}

export function AiShopWizard({ roomId, onGenerated }: AiShopWizardProps) {
  const [step, setStep] = useState<WizardStep>('choosePath');
  const [cart, setCart] = useState<CartCounts>(EMPTY_CART);
  const [typeThemes, setTypeThemes] = useState<Record<CartKey, TypeThemeField>>({
    open: { ...DEFAULT_TYPE_THEME },
    mc: { ...DEFAULT_TYPE_THEME },
    ordering: { ...DEFAULT_TYPE_THEME },
  });
  const [orderingItemCount, setOrderingItemCount] = useState(AI_SHOP_ORDERING_DEFAULT_ITEMS);
  const [difficulty, setDifficulty] = useState<AiQuizDifficulty>('medium');
  const [includePixabayImages, setIncludePixabayImages] = useState(false);
  const [imageProvider, setImageProvider] = useState<AiImageProvider>('pixabay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);

  const total = cartTotal(cart);

  const gameSlotsInCart = useMemo(
    () => cart.gameIds.map((id) => getBuiltInGame(id)).filter(Boolean),
    [cart.gameIds],
  );

  const adjust = (key: CartKey, delta: number) => {
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

  const adjustOrderingItems = (delta: number) => {
    setOrderingItemCount((prev) => clampOrderingItemCount(prev + delta));
  };

  const runGenerate = async (mode: 'instant' | 'cart' | 'regnerace', withTypeThemes: boolean) => {
    setError(null);
    const session = getHostSession(roomId);
    if (!session) {
      setError('Fant ikke Gruizmaster-økt. Gå tilbake og opprett Gruizen på nytt.');
      return;
    }

    const questionCount =
      mode === 'instant'
        ? AI_SHOP_INSTANT_QUESTION_COUNT
        : mode === 'regnerace'
          ? 1
          : total;

    if (mode === 'cart' && total < AI_GENERATE_QUESTION_MIN) {
      setError(`Kurven må ha minst ${AI_GENERATE_QUESTION_MIN} oppgaver.`);
      return;
    }

    const themes = withTypeThemes ? buildTypeThemes(cart, typeThemes) : undefined;
    const slots =
      mode === 'cart'
        ? cartSlotsFromCounts({
            open: cart.open,
            mc: cart.mc,
            ordering: cart.ordering,
            games: cart.gameIds.map((gameId) => ({ gameId })),
            themes,
            orderingItemCount: cart.ordering > 0 ? orderingItemCount : undefined,
          })
        : undefined;

    const fallbackTopic =
      themes?.open ?? themes?.mc ?? themes?.ordering ?? AI_QUIZ_THEME_PRESETS[0];

    setStep('generating');
    setLoading(true);
    try {
      const varietySeed =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const result = await requestAiQuizGeneration(session, {
        mode,
        topic: mode === 'instant' || mode === 'regnerace' ? '' : fallbackTopic,
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
      setOrderingItemCount(AI_SHOP_ORDERING_DEFAULT_ITEMS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke generere Gruiz.');
      setStep(
        mode === 'instant' || mode === 'regnerace'
          ? 'choosePath'
          : withTypeThemes
            ? 'theme'
            : 'cartReady',
      );
    } finally {
      setLoading(false);
    }
  };

  const updateTypeTheme = (key: CartKey, patch: Partial<TypeThemeField>) => {
    setTypeThemes((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const typeThemeEditor = (key: CartKey) => {
    const field = typeThemes[key];
    const meta = TYPE_META[key];
    const isCustom = field.preset === AI_QUIZ_CUSTOM_THEME;
    return (
      <div key={key} className="rounded-xl border border-quiz-border/60 bg-quiz-bg/40 p-3 space-y-2">
        <p className="text-sm font-semibold text-quiz-text">
          <span className="mr-1.5" aria-hidden>
            {meta.emoji}
          </span>
          {meta.label}
          {cart[key] > 1 && (
            <span className="text-quiz-muted font-normal"> ({cart[key]} oppgaver)</span>
          )}
        </p>
        <select
          value={field.preset}
          onChange={(e) => updateTypeTheme(key, { preset: e.target.value })}
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
        {isCustom && (
          <Input
            value={field.custom}
            onChange={(e) => updateTypeTheme(key, { custom: e.target.value })}
            placeholder="Skriv eget tema"
            disabled={loading}
          />
        )}
      </div>
    );
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
          onClick={() => {
            setCart(countsFromPreset());
            setOrderingItemCount(AI_SHOP_ORDERING_DEFAULT_ITEMS);
          }}
          disabled={loading}
        >
          Standardpakke (5)
        </Button>
      </div>

      {(['open', 'mc', 'ordering'] as const).map((key) => {
        const meta = TYPE_META[key];
        return (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-quiz-text">
              <span className="mr-1.5" aria-hidden>
                {meta.emoji}
              </span>
              {meta.label}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-w-[2.5rem]"
                onClick={() => adjust(key, -1)}
                disabled={cart[key] === 0 || loading}
                aria-label={`Fjern ${meta.label}`}
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
                aria-label={`Legg til ${meta.label}`}
              >
                +
              </Button>
            </div>
          </div>
        );
      })}

      <div className="space-y-2 border-t border-quiz-border/40 pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-quiz-text">
            <span className="mr-1.5" aria-hidden>
              🎮
            </span>
            Spill
          </span>
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
                <span className="font-bold text-quiz-text">🎮 {game.label}</span>
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
              <span>🎮 {label}</span>
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

  function countsFromPreset(): CartCounts {
    const slots = QUIZ_PACKAGE_PRESET_SLOTS;
    return {
      open: slots.filter((s) => s.type === 'open').length,
      mc: slots.filter((s) => s.type === 'mc').length,
      ordering: slots.filter((s) => s.type === 'ordering').length,
      gameIds: slots
        .filter((s) => s.type === 'game' && s.gameId)
        .map((s) => s.gameId!),
    };
  }

  const themeBlock = (
    <div className="space-y-4 min-w-0">
      <p className="text-sm text-quiz-muted">
        Velg tema per oppgavetype. Spill bruker standardoppsett og påvirkes ikke av tema her.
      </p>
      {cart.open > 0 && typeThemeEditor('open')}
      {cart.mc > 0 && typeThemeEditor('mc')}
      {cart.ordering > 0 && (
        <>
          {typeThemeEditor('ordering')}
          <div className="rounded-xl border border-quiz-border/60 bg-quiz-bg/40 p-3">
            <p className="text-sm font-semibold text-quiz-text mb-2">
              <span className="mr-1.5" aria-hidden>
                ↕️
              </span>
              Elementer per rekkefølge-oppgave
            </p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-quiz-muted">
                {AI_SHOP_ORDERING_MIN_ITEMS}–{AI_SHOP_ORDERING_MAX_ITEMS} elementer
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-w-[2.5rem]"
                  onClick={() => adjustOrderingItems(-1)}
                  disabled={orderingItemCount <= AI_SHOP_ORDERING_MIN_ITEMS || loading}
                  aria-label="Færre elementer"
                >
                  −
                </Button>
                <span className="w-8 text-center font-bold tabular-nums">{orderingItemCount}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="min-w-[2.5rem]"
                  onClick={() => adjustOrderingItems(1)}
                  disabled={orderingItemCount >= AI_SHOP_ORDERING_MAX_ITEMS || loading}
                  aria-label="Flere elementer"
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
      <div className="min-w-0">
        <label htmlFor="ai-shop-difficulty" className="text-xs text-quiz-muted mb-1 block">
          Vanskelighetsgrad (alle oppgaver)
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
          Spill i kurven får standardoppsett. Juster gjerne i editoren etter generering.
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
        <span className="text-sm text-quiz-muted">Finn bilder til åpne og flervalg (valgfritt)</span>
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

      {!loading && step === 'choosePath' && (
        <div className="space-y-3">
          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={() => void runGenerate('instant', false)}
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
            onClick={() => void runGenerate('regnerace', false)}
          >
            Lag Regnerace
          </Button>
          <p className="text-xs text-center text-quiz-muted">
            Én Regnerace-oppgave — regnestykkene genereres under spillet
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

      {!loading && step === 'buildCart' && (
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

      {!loading && step === 'cartReady' && (
        <div className="space-y-4">
          <p className="text-sm text-quiz-muted">
            {total} oppgaver i kurven. Du kan gå tilbake og justere.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="flex-1"
              disabled={loading}
              onClick={() => void runGenerate('cart', false)}
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
          <p className="text-xs text-quiz-muted">
            «Lag Gruiz» uten tema bruker Allmennkunnskap for alle typer. «Velg tema» lar deg styre
            åpne, flervalg og rekkefølge hver for seg.
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep('buildCart')}>
            Tilbake
          </Button>
        </div>
      )}

      {!loading && step === 'theme' && (
        <div className="space-y-4">
          {themeBlock}
          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={() => void runGenerate('cart', true)}
          >
            Lag Gruiz
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep('cartReady')}>
            Tilbake
          </Button>
        </div>
      )}

      {loading && <AiShopGeneratingPanel steps={LOADING_STEPS} />}

      {error && (
        <p className="text-sm text-red-400 break-words" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
