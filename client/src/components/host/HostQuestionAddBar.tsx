import { builtInGames, type GameId } from '@quiz-tool/shared';
import { Button } from '../ui/Button';

interface HostQuestionAddBarProps {
  onAddOpen: () => void;
  onAddMc: () => void;
  onAddOrdering: () => void;
  onAddGame: (gameId: GameId) => void;
  gamePickerOpen: boolean;
  onGamePickerOpenChange: (open: boolean) => void;
  variant?: 'top' | 'bottom';
}

export function HostQuestionAddBar({
  onAddOpen,
  onAddMc,
  onAddOrdering,
  onAddGame,
  gamePickerOpen,
  onGamePickerOpenChange,
  variant = 'top',
}: HostQuestionAddBarProps) {
  const isBottom = variant === 'bottom';

  return (
    <div
      className={
        isBottom
          ? 'rounded-xl border border-quiz-accent/30 bg-quiz-bg/60 border-dashed p-4 mt-4 min-w-0 max-w-full overflow-hidden'
          : 'rounded-xl bg-quiz-bg/60 border border-quiz-accent/20 p-4 mb-6 min-w-0 max-w-full overflow-hidden'
      }
    >
      <p className="text-sm font-medium text-quiz-text mb-3">
        {isBottom ? 'Legg til flere oppgaver' : 'Legg til spørsmål'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onAddOpen}>
          + Åpent spørsmål
        </Button>
        <Button type="button" variant="secondary" onClick={onAddMc}>
          + Flervalg (MC)
        </Button>
        <Button type="button" variant="secondary" onClick={onAddOrdering}>
          + Rekkefølge
        </Button>
      </div>
      <div className="mt-3 rounded-xl border border-quiz-border/70 bg-quiz-bg/50 p-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onGamePickerOpenChange(!gamePickerOpen)}
          aria-expanded={gamePickerOpen}
        >
          + Spill
        </Button>
        {gamePickerOpen && (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {builtInGames.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => onAddGame(game.id)}
                className="min-h-[64px] rounded-xl border border-quiz-border bg-quiz-surface-elevated px-3 py-2 text-left transition-colors hover:border-quiz-accent hover:bg-quiz-accent/10"
              >
                <span className="block text-sm font-bold text-quiz-text">{game.label}</span>
                <span className="mt-0.5 block text-xs text-quiz-muted">{game.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
