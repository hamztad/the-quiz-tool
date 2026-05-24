import { CLIENT_EVENTS, type Protest, type PublicRoomState } from '@quiz-tool/shared';
import { QuestionBody } from '../question/QuestionBody';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useSocket } from '../../hooks/useSocket';
import { getQuestionFasitText } from '../../lib/hostAnswerKey';
import { formatTeamAnswerDisplay } from '../../lib/teamAnswerDisplay';
import { getTeamQuestionScore } from '../../lib/teamScoreDisplay';

interface HostProtestsOverviewProps {
  room: PublicRoomState;
  protests: Protest[];
}

function statusLabel(status: Protest['status']): string {
  switch (status) {
    case 'pending':
      return 'Venter';
    case 'approved':
      return 'Godkjent';
    case 'rejected':
      return 'Avvist';
  }
}

function statusVariant(status: Protest['status']): 'open' | 'submitted' | 'locked' {
  switch (status) {
    case 'pending':
      return 'open';
    case 'approved':
      return 'submitted';
    case 'rejected':
      return 'locked';
  }
}

function ProtestCard({ protest, room }: { protest: Protest; room: PublicRoomState }) {
  const { socket } = useSocket();
  const team = room.teams.find((t) => t.id === protest.teamId);
  const question = room.questions.find((q) => q.id === protest.questionId);
  if (!question) return null;

  const answer = room.answers.find(
    (a) => a.teamId === protest.teamId && a.questionId === protest.questionId,
  );
  const answerText = formatTeamAnswerDisplay(question, answer?.value);
  const fasit = getQuestionFasitText(question);
  const score = getTeamQuestionScore(room, protest.teamId, protest.questionId);
  const graderTeam = score.graderTeamId
    ? room.teams.find((t) => t.id === score.graderTeamId)
    : undefined;

  return (
    <article className="rounded-xl border border-quiz-border/70 bg-quiz-surface-elevated/40 p-4 space-y-3 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-quiz-text">{team?.name ?? 'Lag'}</span>
        <Badge variant={statusVariant(protest.status)}>{statusLabel(protest.status)}</Badge>
      </div>

      <QuestionBody question={question} showHint={false} />

      <div className="grid gap-3 sm:grid-cols-2 text-sm min-w-0">
        <div className="rounded-lg border border-quiz-border/60 bg-quiz-bg/40 p-3 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-quiz-muted mb-1">
            Lagets svar
          </p>
          <p className="font-medium text-quiz-text break-words [overflow-wrap:anywhere]">
            {answerText ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-green-400 mb-1">Fasit</p>
          <p className="font-medium text-quiz-text break-words [overflow-wrap:anywhere]">
            {fasit ?? '—'}
          </p>
        </div>
      </div>

      <p className="text-sm text-quiz-muted">
        Poeng gitt:{' '}
        <span className="font-semibold text-quiz-text">
          {score.points !== null ? `${score.points}/${question.maxPoints}` : '—'}
        </span>
        {graderTeam && ` · rettet av ${graderTeam.name}`}
      </p>

      {protest.message && (
        <p className="text-sm text-quiz-text rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 break-words [overflow-wrap:anywhere]">
          <span className="font-semibold">Protest: </span>
          {protest.message}
        </p>
      )}

      {protest.status === 'pending' && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() =>
              socket.emit(CLIENT_EVENTS.PROTEST_RESOLVE, {
                protestId: protest.id,
                approved: true,
                points: question.maxPoints,
              })
            }
          >
            Godkjenn (full poeng)
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() =>
              socket.emit(CLIENT_EVENTS.PROTEST_RESOLVE, {
                protestId: protest.id,
                approved: false,
              })
            }
          >
            Avvis
          </Button>
        </div>
      )}
    </article>
  );
}

export function HostProtestsOverview({ room, protests }: HostProtestsOverviewProps) {
  if (protests.length === 0) return null;

  const pending = protests.filter((p) => p.status === 'pending');
  const resolved = protests.filter((p) => p.status !== 'pending');

  const groupByTeam = (list: Protest[]) => {
    const map = new Map<string, Protest[]>();
    for (const p of list) {
      const existing = map.get(p.teamId) ?? [];
      existing.push(p);
      map.set(p.teamId, existing);
    }
    return [...map.entries()].sort(([a], [b]) => {
      const nameA = room.teams.find((t) => t.id === a)?.name ?? '';
      const nameB = room.teams.find((t) => t.id === b)?.name ?? '';
      return nameA.localeCompare(nameB, 'nb');
    });
  };

  return (
    <Card className="min-w-0 max-w-full">
      <h2 className="text-lg font-bold mb-1">Protester</h2>
      <p className="text-sm text-quiz-muted mb-4">
        {pending.length > 0
          ? `${pending.length} venter på behandling`
          : 'Ingen ventende protester'}
      </p>

      {pending.length > 0 && (
        <section className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-quiz-text">Venter</h3>
          {groupByTeam(pending).map(([teamId, teamProtests]) => (
            <div key={teamId} className="space-y-3">
              {teamProtests.map((p) => (
                <ProtestCard key={p.id} protest={p} room={room} />
              ))}
            </div>
          ))}
        </section>
      )}

      {resolved.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-quiz-muted">Behandlet</h3>
          {groupByTeam(resolved).map(([teamId, teamProtests]) => (
            <div key={teamId} className="space-y-3">
              {teamProtests.map((p) => (
                <ProtestCard key={p.id} protest={p} room={room} />
              ))}
            </div>
          ))}
        </section>
      )}
    </Card>
  );
}
