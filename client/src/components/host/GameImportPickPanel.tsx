import { builtInGames, type GameId, type GamePickRequest } from '@quiz-tool/shared';
import { Button } from '../ui/Button';

interface GameImportPickPanelProps {
  requests: GamePickRequest[];
  picks: Record<string, GameId>;
  onPick: (tempId: string, gameId: GameId) => void;
  onDismiss?: () => void;
}

export function GameImportPickPanel({
  requests,
  picks,
  onPick,
  onDismiss,
}: GameImportPickPanelProps) {
  if (requests.length === 0) return null;

  return (
    <div className="rounded-xl border border-quiz-accent/40 bg-quiz-accent/5 p-4 space-y-4 min-w-0">
      <div className="space-y-1">
        <p className="text-sm font-medium text-quiz-text">Velg spill for import</p>
        <p className="text-xs text-quiz-muted break-words">
          Teksten inneholder GAME uten spillnavn. Velg ett spill per oppgave før du legger til eller
          forhåndsviser.
        </p>
      </div>
      {requests.map((req) => {
        const title = req.lines[0]?.text?.trim() || 'Spillspørsmål';
        const bodyPreview = req.lines
          .slice(1)
          .map((l) => l.text)
          .filter(Boolean)
          .join(' · ');
        const selected = picks[req.tempId];

        return (
          <div
            key={req.tempId}
            className="rounded-xl border border-quiz-border/70 bg-quiz-surface/80 p-3 space-y-2 min-w-0"
          >
            <p className="text-sm font-medium text-quiz-text break-words">{title}</p>
            {bodyPreview && (
              <p className="text-xs text-quiz-muted break-words">{bodyPreview}</p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {builtInGames.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => onPick(req.tempId, game.id)}
                  className={`min-h-[56px] rounded-xl border px-3 py-2 text-left transition-colors ${
                    selected === game.id
                      ? 'border-quiz-accent bg-quiz-accent/15'
                      : 'border-quiz-border bg-quiz-surface-elevated hover:border-quiz-accent hover:bg-quiz-accent/10'
                  }`}
                >
                  <span className="block text-sm font-bold text-quiz-text">{game.label}</span>
                  <span className="mt-0.5 block text-xs text-quiz-muted">{game.description}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {onDismiss && (
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          Lukk
        </Button>
      )}
    </div>
  );
}
