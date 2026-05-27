import { formatCountdown, useSyncedCountdown } from '../../hooks/useSyncedCountdown';

interface QuestionTimerBarProps {
  endsAt: number;
  openedAt?: number;
  serverNow?: number;
  label?: string;
  compact?: boolean;
}

export function QuestionTimerBar({
  endsAt,
  openedAt,
  serverNow,
  label = 'Tid igjen',
  compact = false,
}: QuestionTimerBarProps) {
  const { remaining, progress, urgency } = useSyncedCountdown(endsAt, serverNow, openedAt);

  const barClass =
    urgency === 'critical'
      ? 'bg-gradient-to-r from-red-500 to-orange-500 animate-pulse'
      : urgency === 'warning'
        ? 'bg-gradient-to-r from-amber-400 to-orange-500'
        : 'bg-gradient-to-r from-violet-500 to-cyan-500';

  const textClass =
    urgency === 'critical'
      ? 'text-red-700'
      : urgency === 'warning'
        ? 'text-amber-800'
        : 'text-violet-800';

  return (
    <div
      className={`rounded-2xl border-2 border-indigo-200/70 bg-white/90 ${compact ? 'px-3 py-2' : 'px-4 py-3'} shadow-sm`}
      role="timer"
      aria-live="polite"
      aria-label={`${label}: ${formatCountdown(remaining)}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`text-xs font-bold uppercase tracking-wide ${textClass}`}>
          ⏱️ {label}
        </span>
        <span className={`quiz-display text-lg font-bold tabular-nums ${textClass}`}>
          {formatCountdown(remaining)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100/80">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${barClass}`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
