import { computeLeaderboard } from '../../lib/leaderboard';
import type { PublicRoomState } from '@quiz-tool/shared';
import { Card } from '../ui/Card';

interface LeaderboardBaseProps {
  room: PublicRoomState;
  /** Selvgående / underveis — ikke endelig resultat. */
  provisional?: boolean;
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

const rankMedals = ['🥇', '🥈', '🥉'] as const;

const rankCircleClass = [
  'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 shadow-md ring-2 ring-amber-200/80',
  'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900 shadow-md ring-2 ring-slate-200/80',
  'bg-gradient-to-br from-amber-600 to-orange-700 text-amber-50 shadow-md ring-2 ring-orange-300/50',
] as const;

export function Leaderboard(props: LeaderboardProps) {
  const { room, provisional = false } = props;
  const entries = computeLeaderboard(room);
  const hostInteractive = props.hostInteractive === true;
  const maxPoints = Math.max(1, ...entries.map((e) => e.totalPoints));

  return (
    <Card elevated className="min-w-0 max-w-full overflow-hidden border-amber-200/50 bg-gradient-to-br from-amber-50/40 via-white/95 to-violet-50/30">
      <div className="flex items-center gap-3 mb-1">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-2xl shadow-md" aria-hidden>
          🏆
        </span>
        <div>
          <h2 className="quiz-display text-2xl font-bold text-quiz-text">
            {room.settings.finalResultLocked
              ? 'Endelig leaderboard'
              : provisional
                ? 'Midlertidig leaderboard'
                : 'Leaderboard'}
          </h2>
          {room.settings.finalResultLocked && (
            <p className="text-sm font-semibold text-emerald-700">Sluttresultatet er låst ✨</p>
          )}
          {provisional && !room.settings.finalResultLocked && (
            <p className="text-sm font-semibold text-amber-800">Underveis — kan endres</p>
          )}
        </div>
      </div>
      {hostInteractive && (
        <p className="text-sm text-quiz-muted mt-2 mb-4 break-words">
          Trykk på deltakernavn for besvarelser og poeng. × kaster ut deltakere som har forlatt.
        </p>
      )}
      {!hostInteractive && <div className="mb-4" />}
      <ol className="space-y-3 min-w-0">
        {entries.map((entry, i) => {
          const isSelected = hostInteractive && props.selectedTeamId === entry.teamId;
          const answeredCount = hostInteractive
            ? (room.answeredByTeam[entry.teamId] ?? []).length
            : 0;
          const barWidth = `${Math.max(8, (entry.totalPoints / maxPoints) * 100)}%`;
          const isTopThree = i < 3;
          const medal = rankMedals[i];

          return (
            <li
              key={entry.teamId}
              className={`quiz-animate-in rounded-2xl px-4 py-3 transition-colors ${
                isSelected
                  ? 'border-2 border-violet-400/70 bg-violet-50/80 shadow-md'
                  : 'border border-indigo-100/80 bg-white/70 shadow-sm'
              }`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="flex gap-3 items-center min-w-0">
                {isTopThree ? (
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${rankCircleClass[i]}`}
                    aria-hidden
                  >
                    {medal}
                  </span>
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-800 tabular-nums">
                    {i + 1}
                  </span>
                )}
                {hostInteractive ? (
                  <button
                    type="button"
                    onClick={() => props.onSelectTeam(entry.teamId)}
                    className="min-w-0 flex-1 text-left font-bold text-quiz-text break-words [overflow-wrap:anywhere] rounded-lg -m-1 p-1 hover:text-violet-700 transition-colors"
                    aria-pressed={isSelected}
                  >
                    {i === 0 && room.settings.finalResultLocked ? '★ ' : ''}
                    {entry.teamName}
                  </button>
                ) : (
                  <span className="min-w-0 flex-1 font-bold text-quiz-text break-words [overflow-wrap:anywhere]">
                    {i === 0 && room.settings.finalResultLocked ? '★ ' : ''}
                    {entry.teamName}
                  </span>
                )}
                <span className="text-lg font-extrabold text-violet-700 shrink-0 tabular-nums">
                  {entry.totalPoints}
                  <span className="text-xs font-semibold text-quiz-muted ml-0.5">p</span>
                </span>
                {hostInteractive && (
                  <button
                    type="button"
                    onClick={() => props.onRemoveTeam(entry.teamId, entry.teamName)}
                    className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-red-200/80 text-red-500 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700"
                    title={`Kast ut ${entry.teamName}`}
                    aria-label={`Kast ut ${entry.teamName}`}
                  >
                    <span className="text-xl font-light leading-none" aria-hidden>
                      ×
                    </span>
                  </button>
                )}
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-100/80">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${
                    i === 0
                      ? 'from-amber-400 via-yellow-400 to-amber-500'
                      : i === 1
                        ? 'from-slate-300 to-slate-400'
                        : i === 2
                          ? 'from-amber-600 to-orange-600'
                          : 'from-violet-400 to-fuchsia-500'
                  } origin-left`}
                  style={{
                    width: barWidth,
                    animation: 'quiz-bar-grow 0.6s ease-out both',
                    animationDelay: `${i * 0.05 + 0.1}s`,
                  }}
                />
              </div>
              {hostInteractive && props.showAnswerStats && (
                <p className="mt-1.5 text-xs text-quiz-muted tabular-nums">
                  {answeredCount} besvarte oppgaver
                </p>
              )}
            </li>
          );
        })}
        {entries.length === 0 && (
          <p className="text-quiz-muted text-sm text-center py-6">Ingen deltakere ennå — inviter noen! 👥</p>
        )}
      </ol>
    </Card>
  );
}
