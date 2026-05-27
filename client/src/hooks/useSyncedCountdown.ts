import { useEffect, useState } from 'react';
import { remainingMs } from '@quiz-tool/shared';

export function useSyncedCountdown(
  endsAt: number | undefined,
  serverNow: number | undefined,
  openedAt?: number,
): { remaining: number; progress: number; urgency: 'normal' | 'warning' | 'critical' } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!endsAt) {
    return { remaining: 0, progress: 0, urgency: 'normal' };
  }

  const skew = serverNow ? serverNow - Date.now() : 0;
  const adjustedNow = now + skew;
  const remaining = remainingMs(endsAt, adjustedNow);
  const duration =
    openedAt && endsAt > openedAt ? endsAt - openedAt : Math.max(remaining, 1);
  const progress = Math.min(1, Math.max(0, 1 - remaining / duration));

  const urgency =
    remaining <= 3_000 ? 'critical' : remaining <= 10_000 ? 'warning' : 'normal';

  return { remaining, progress, urgency };
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) {
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
  return `${sec}s`;
}
