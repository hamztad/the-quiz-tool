import { computeLeaderboard } from '../../lib/leaderboard';
import type { PublicRoomState } from '@quiz-tool/shared';
import { Card } from '../ui/Card';

interface LeaderboardProps {
  room: PublicRoomState;
}

export function Leaderboard({ room }: LeaderboardProps) {
  const entries = computeLeaderboard(room);

  return (
    <Card className="min-w-0 max-w-full overflow-hidden">
      <h2 className="text-lg font-bold mb-4">Leaderboard</h2>
      <ol className="space-y-2 min-w-0">
        {entries.map((entry, i) => (
          <li
            key={entry.teamId}
            className="flex gap-3 items-center justify-between min-w-0 rounded-xl bg-quiz-surface-elevated px-4 py-3"
          >
            <span className="flex items-start gap-3 min-w-0 flex-1">
              <span className="text-quiz-muted w-6 shrink-0 tabular-nums">{i + 1}.</span>
              <span className="font-medium break-words [overflow-wrap:anywhere] min-w-0">
                {entry.teamName}
              </span>
            </span>
            <span className="text-quiz-accent font-bold shrink-0 tabular-nums">{entry.totalPoints} p</span>
          </li>
        ))}
        {entries.length === 0 && (
          <p className="text-quiz-muted text-sm">Ingen lag ennå.</p>
        )}
      </ol>
    </Card>
  );
}
