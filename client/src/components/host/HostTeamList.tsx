import type { PublicRoomState } from '@quiz-tool/shared';
import { Card } from '../ui/Card';

interface HostTeamListProps {
  room: PublicRoomState;
  onRemoveTeam: (teamId: string, teamName: string) => void;
  showAnswerStats?: boolean;
  emptyHint?: string;
}

export function HostTeamList({
  room,
  onRemoveTeam,
  showAnswerStats = false,
  emptyHint = 'Venter på lag…',
}: HostTeamListProps) {
  return (
    <Card className="min-w-0">
      <h2 className="font-semibold mb-3">Lag ({room.teams.length})</h2>
      <ul className="space-y-2">
        {room.teams.map((team) => (
          <li
            key={team.id}
            className="flex items-start gap-2 min-w-0 text-sm rounded-xl border border-quiz-border/60 bg-quiz-surface-elevated/40 px-3 py-2.5"
          >
            <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] font-medium">
              {team.name}
            </span>
            {showAnswerStats && (
              <span className="shrink-0 text-quiz-muted tabular-nums pt-0.5">
                {(room.answeredByTeam[team.id] ?? []).length} besvarte
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemoveTeam(team.id, team.name)}
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-quiz-border/80 text-quiz-muted transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
              aria-label={`Fjern ${team.name} fra quizen`}
            >
              <span className="text-xl font-light leading-none" aria-hidden>
                ×
              </span>
            </button>
          </li>
        ))}
        {room.teams.length === 0 && (
          <p className="text-quiz-muted text-sm">{emptyHint}</p>
        )}
      </ul>
    </Card>
  );
}
