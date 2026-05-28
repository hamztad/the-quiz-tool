import { getIntervalParticipantStatus, getIntervalWindow, type PublicRoomState } from '@quiz-tool/shared';
import { formatCountdown } from '../../hooks/useSyncedCountdown';
import { useLiveClock } from '../../hooks/useLiveClock';

interface OppgaveIntervalBadgeProps {
  room: PublicRoomState;
  questionId: string;
}

export function OppgaveIntervalBadge({ room, questionId }: OppgaveIntervalBadgeProps) {
  const now = useLiveClock();
  const skew = room.serverNow ? room.serverNow - Date.now() : 0;
  const adjustedNow = now + skew;

  const status = getIntervalParticipantStatus(
    room.schedule,
    room.questionStatus,
    questionId,
    adjustedNow,
  );
  const window = getIntervalWindow(room.schedule, questionId);

  if (!status || !window) return null;

  if (status === 'open') {
    const remaining = Math.max(0, window.closesAt - adjustedNow);
    return (
      <span className="inline-flex items-center gap-1 rounded-full border-2 border-emerald-400 bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
        ÅPEN
        {remaining > 0 && (
          <span className="tabular-nums font-semibold text-emerald-800">
            · {formatCountdown(remaining)}
          </span>
        )}
      </span>
    );
  }

  if (status === 'countdown') {
    const remaining = Math.max(0, window.opensAt - adjustedNow);
    return (
      <span className="inline-flex items-center gap-1 rounded-full border-2 border-violet-300 bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-900">
        Åpner om <span className="tabular-nums">{formatCountdown(remaining)}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border-2 border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
      STENGT
    </span>
  );
}
