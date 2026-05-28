import { useEffect, useState } from 'react';

/** Monotonic client clock for live countdowns (ticks every 250ms). */
export function useLiveClock(tickMs = 250): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return now;
}
