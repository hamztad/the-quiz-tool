import { computeLeaderboard } from '../../lib/leaderboard';
import type { PublicRoomState } from '@quiz-tool/shared';
import { Card } from '../ui/Card';

interface LeaderboardBaseProps {
  room: PublicRoomState;
}

interface LeaderboardReadonlyProps extends LeaderboardBaseProps {
  hostInteractive?: false;
}

interface LeaderboardHostProps extends LeaderboardBaseProps {
  hostInteractive: true;
  selectedTeamId?: string | null;
  onSelectTeam: (teamId: string) => void;
  onRemoveTeam: (teamId: string, teamName: string) => void;
  showAnswerStats?: boolean;
}

export type LeaderboardProps = LeaderboardReadonlyProps | LeaderboardHostProps;

export function Leaderboard(props: LeaderboardProps) {
  const { room } = props;
  const entries = computeLeaderboard(room);
  const hostInteractive = props.hostInteractive === true;

  return (
    <Card className="min-w-0 max-w-full overflow-hidden">
      <h2 className="text-lg font-bold">
        {room.settings.finalResultLocked ? 'Endelig leaderboard' : 'Leaderboard'}
      </h2>
      {room.settings.finalResultLocked && (
        <p className="mt-1 mb-3 text-xs font-medium text-green-300">
          Sluttresultatet er låst av quizmaster.
        </p>
      )}
      {hostInteractive && (
        <p className="text-xs text-quiz-muted mt-1 mb-3 break-words">
          Trykk på deltakernavn for besvarelser og poeng. × kaster ut deltakere som har forlatt.
        </p>
      )}
      {!hostInteractive && <div className="mb-4" />}
      <ol className="space-y-2 min-w-0">
        {entries.map((entry, i) => {
          const isSelected = hostInteractive && props.selectedTeamId === entry.teamId;
          const answeredCount = hostInteractive
            ? (room.answeredByTeam[entry.teamId] ?? []).length
            : 0;

          return (
            <li
              key={entry.teamId}
              className={`flex gap-2 items-start min-w-0 rounded-xl px-4 py-3 ${
                isSelected
                  ? 'border border-quiz-accent/60 bg-quiz-accent/10'
                  : 'bg-quiz-surface-elevated border border-transparent'
              }`}
            >
              <span className="text-quiz-muted w-6 shrink-0 tabular-nums pt-0.5">{i + 1}.</span>
              {hostInteractive ? (
                <button
                  type="button"
                  onClick={() => props.onSelectTeam(entry.teamId)}
                  className="min-w-0 flex-1 text-left font-medium break-words [overflow-wrap:anywhere] rounded-lg -m-1 p-1 hover:text-quiz-accent transition-colors"
                  aria-pressed={isSelected}
                >
                  {i === 0 && room.settings.finalResultLocked ? '★ ' : ''}
                  {entry.teamName}
                </button>
              ) : (
                <span className="min-w-0 flex-1 font-medium break-words [overflow-wrap:anywhere]">
                  {i === 0 && room.settings.finalResultLocked ? '★ ' : ''}
                  {entry.teamName}
                </span>
              )}
              {hostInteractive && props.showAnswerStats && (
                <span className="shrink-0 text-xs text-quiz-muted tabular-nums pt-0.5">
                  {answeredCount} besvarte
                </span>
              )}
              <span className="text-quiz-accent font-bold shrink-0 tabular-nums pt-0.5">
                {entry.totalPoints} p
              </span>
              {hostInteractive && (
                <button
                  type="button"
                  onClick={() => props.onRemoveTeam(entry.teamId, entry.teamName)}
                  className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-quiz-border/80 text-quiz-muted transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
                  title={`Kast ut ${entry.teamName}`}
                  aria-label={`Kast ut ${entry.teamName}`}
                >
                  <span className="text-xl font-light leading-none" aria-hidden>
                    ×
                  </span>
                </button>
              )}
            </li>
          );
        })}
        {entries.length === 0 && (
          <p className="text-quiz-muted text-sm">Ingen deltakere ennå.</p>
        )}
      </ol>
    </Card>
  );
}
