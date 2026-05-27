import type { PublicRoomState } from '@quiz-tool/shared';
import { formatScheduleClock } from '@quiz-tool/shared';
import { formatCountdown, useSyncedCountdown } from '../../hooks/useSyncedCountdown';
import { useRoomTimers } from '../../hooks/useRoomTimers';

interface QuizScheduleBannerProps {
  room: PublicRoomState;
}

export function QuizScheduleBanner({ room }: QuizScheduleBannerProps) {
  const { quizStartsAt, quizEndsAt, serverNow } = useRoomTimers(room);

  const startCountdown = useSyncedCountdown(quizStartsAt ?? undefined, serverNow);
  const endCountdown = useSyncedCountdown(quizEndsAt ?? undefined, serverNow);

  if (room.phase === 'lobby' && quizStartsAt) {
    return (
      <div className="mb-4 rounded-2xl border-2 border-violet-300/60 bg-gradient-to-r from-violet-50 to-cyan-50 px-4 py-4 text-center shadow-sm quiz-animate-in">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-700">
          Quizen starter om
        </p>
        <p className="quiz-display mt-1 text-4xl font-bold tabular-nums text-violet-900">
          {formatCountdown(startCountdown.remaining)}
        </p>
        <p className="mt-2 text-sm text-quiz-muted">
          Starter {formatScheduleClock(quizStartsAt)} · vent her til quizen er i gang.
        </p>
      </div>
    );
  }

  if (room.phase === 'live' && quizEndsAt) {
    return (
      <div className="mb-4 rounded-2xl border-2 border-amber-300/60 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-left">
            <span className="text-sm font-bold text-amber-900 block">Quiz slutter om</span>
            {quizEndsAt && (
              <span className="text-xs text-amber-800/80">
                {formatScheduleClock(quizEndsAt)}
              </span>
            )}
          </div>
          <span className="quiz-display text-2xl font-bold tabular-nums text-amber-900">
            {formatCountdown(endCountdown.remaining)}
          </span>
        </div>
      </div>
    );
  }

  return null;
}
