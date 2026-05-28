import { formatDisconnectedDuration, isReconnectGraceActive, type PublicRoomState } from '@quiz-tool/shared';
import { Card } from '../ui/Card';

interface HostTeamListProps {
  room: PublicRoomState;
  onRemoveTeam: (teamId: string, teamName: string) => void;
  onSelectTeam?: (teamId: string) => void;
  selectedTeamId?: string | null;
  showAnswerStats?: boolean;
  emptyHint?: string;
}

export function HostTeamList({
  room,
  onRemoveTeam,
  onSelectTeam,
  selectedTeamId = null,
  showAnswerStats = false,
  emptyHint = 'Venter på deltakere…',
}: HostTeamListProps) {
  const canOpenTeam = Boolean(onSelectTeam);

  return (
    <Card className="min-w-0">
      <h2 className="font-semibold">Deltakere ({room.teams.length})</h2>
      <p className="text-xs text-quiz-muted mt-1 mb-3">
        {canOpenTeam
          ? 'Trykk på deltakernavn for besvarelser og poeng. × kaster ut deltakere som har forlatt.'
          : 'Trykk × for å kaste ut en deltaker som har forlatt eller ikke skal være med.'}
      </p>
      <ul className="space-y-2">
        {room.teams.map((team) => {
          const isSelected = selectedTeamId === team.id;
          const presence = room.teamPresence[team.id];
          const connected = presence?.status !== 'disconnected';
          const reconnectActive = isReconnectGraceActive(presence);

          return (
            <li
              key={team.id}
              className={`flex items-start gap-2 min-w-0 text-sm rounded-xl border px-3 py-2.5 ${
                isSelected
                  ? 'border-quiz-accent/60 bg-quiz-accent/10'
                  : 'border-quiz-border/60 bg-quiz-surface-elevated/40'
              }`}
            >
              {canOpenTeam ? (
                <button
                  type="button"
                  onClick={() => onSelectTeam?.(team.id)}
                  className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] font-medium text-left rounded-lg -m-1 p-1 hover:text-quiz-accent transition-colors"
                  aria-pressed={isSelected}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden>{connected ? '🟢' : '⚪'}</span>
                    <span className="min-w-0 flex-1">
                      {team.name}
                      {!connected && (
                        <span className="ml-2 text-xs font-normal text-quiz-muted">
                          ({formatDisconnectedDuration(presence?.disconnectedAt)}
                          {reconnectActive ? ' · kan koble til igjen' : ''})
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              ) : (
                <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] font-medium">
                  <span aria-hidden>{connected ? '🟢 ' : '⚪ '}</span>
                  {team.name}
                  {!connected && (
                    <span className="ml-2 text-xs font-normal text-quiz-muted">
                      ({formatDisconnectedDuration(presence?.disconnectedAt)}
                      {reconnectActive ? ' · kan koble til igjen' : ''})
                    </span>
                  )}
                </span>
              )}
              {showAnswerStats && (
                <span className="shrink-0 text-quiz-muted tabular-nums pt-0.5">
                  {(room.answeredByTeam[team.id] ?? []).length} besvarte
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemoveTeam(team.id, team.name)}
                className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg border border-quiz-border/80 text-quiz-muted transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-800"
                title={`Kast ut ${team.name}`}
                aria-label={`Kast ut ${team.name}`}
              >
                <span className="text-xl font-light leading-none" aria-hidden>
                  ×
                </span>
              </button>
            </li>
          );
        })}
        {room.teams.length === 0 && (
          <p className="text-quiz-muted text-sm">{emptyHint}</p>
        )}
      </ul>
    </Card>
  );
}
