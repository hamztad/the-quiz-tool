import { computeLeaderboard } from '../../lib/leaderboard';
import type { PublicRoomState } from '@quiz-tool/shared';
import { Card } from '../ui/Card';

interface LeaderboardProps {
  room: PublicRoomState;
}

export function Leaderboard({ room }: LeaderboardProps) {
  const entries = computeLeaderboard(room);

  return (
    <Card>
      <h2 className="text-lg font-bold mb-4">Leaderboard</h2>
      <ol className="space-y-2">
        {entries.map((entry, i) => (
          <li
            key={entry.teamId}
            className="flex items-center justify-between rounded-xl bg-quiz-surface-elevated px-4 py-3"
          >
            <span className="flex items-center gap-3">
              <span className="text-quiz-muted w-6">{i + 1}.</span>
              <span className="font-medium">{entry.teamName}</span>
            </span>
            <span className="text-quiz-accent font-bold">{entry.totalPoints} p</span>
          </li>
        ))}
        {entries.length === 0 && (
          <p className="text-quiz-muted text-sm">Ingen lag ennå.</p>
        )}
      </ol>
    </Card>
  );
}
