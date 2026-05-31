import {
  MAX_SCHEDULE_DELAY_MS,
  MAX_SCHEDULE_DURATION_MS,
  MIN_SCHEDULE_DELAY_MS,
} from './timerConfig.js';
import type { Question } from '../types/room.js';
import { attachIntervalWindowsToSchedule } from '../quiz/intervalSchedule.js';
import { normalizeDeliveryMode } from '../quiz/quizModes.js';
import type { QuizDeliveryMode, QuizRunMode, QuizSchedule } from '../types/schedule.js';
import { buildArmedSchedule } from './timerEngine.js';

export interface SetScheduleInput {
  /** Relative: ms from now until quiz start */
  startDelayMs?: number;
  /** Relative: quiz length after start (omit for open-ended) */
  durationMs?: number;
  /** Absolute: Unix ms when quiz should start */
  startsAt?: number;
  /** Absolute: Unix ms when quiz should end (alternative to durationMs) */
  endsAt?: number;
  runMode?: QuizRunMode;
  deliveryMode?: QuizDeliveryMode;
  autoOpenFirstQuestion?: boolean;
}

const SCHEDULE_START_GRACE_MS = 30_000;

export function validateScheduleInput(input: SetScheduleInput, now = Date.now()): string | null {
  const hasRelative = input.startDelayMs !== undefined;
  const hasAbsolute = input.startsAt !== undefined;

  if (hasRelative && hasAbsolute) {
    return 'Velg enten relativ forsinkelse eller klokkeslett for start — ikke begge.';
  }
  if (!hasRelative && !hasAbsolute) {
    return 'Angi når Gruizen skal starte.';
  }

  if (hasAbsolute) {
    const startsAt = input.startsAt!;
    if (!Number.isFinite(startsAt)) {
      return 'Ugyldig starttid.';
    }
    if (startsAt < now - SCHEDULE_START_GRACE_MS) {
      return 'Starttid kan ikke ligge i fortiden.';
    }
    if (startsAt > now + MAX_SCHEDULE_DELAY_MS) {
      return 'Start kan maks planlegges 3 døgn frem i tid.';
    }

    let durationMs: number | undefined;
    if (input.endsAt !== undefined) {
      if (!Number.isFinite(input.endsAt)) {
        return 'Ugyldig sluttid.';
      }
      if (input.endsAt <= startsAt) {
        return 'Sluttid må være etter starttid.';
      }
      durationMs = input.endsAt - startsAt;
    } else if (input.durationMs !== undefined) {
      durationMs = input.durationMs;
    }

    if (durationMs !== undefined) {
      if (durationMs < 0 || durationMs > MAX_SCHEDULE_DURATION_MS) {
        return 'Varighet kan maks være 24 timer.';
      }
    }
    const mode = normalizeDeliveryMode(input.deliveryMode);
    if (
      (mode === 'self_paced' || mode === 'interval') &&
      !input.endsAt &&
      !(input.durationMs && input.durationMs > 0)
    ) {
      return `${mode === 'interval' ? 'Intervall' : 'Selvgående'} quiz må ha en sluttid (varighet).`;
    }
    return null;
  }

  const startDelayMs = input.startDelayMs!;
  if (startDelayMs < MIN_SCHEDULE_DELAY_MS || startDelayMs > MAX_SCHEDULE_DELAY_MS) {
    return 'Startforsinkelse kan maks være 3 døgn.';
  }
  if (
    input.durationMs !== undefined &&
    (input.durationMs < 0 || input.durationMs > MAX_SCHEDULE_DURATION_MS)
  ) {
    return 'Varighet kan maks være 24 timer.';
  }
  const mode = normalizeDeliveryMode(input.deliveryMode);
  if ((mode === 'self_paced' || mode === 'interval') && !(input.durationMs && input.durationMs > 0)) {
    return `${mode === 'interval' ? 'Intervall' : 'Selvgående'} quiz må ha en sluttid (varighet).`;
  }
  return null;
}

export function resolveScheduleTimes(
  input: SetScheduleInput,
  now: number,
): { startsAt: number; endsAt?: number; startDelayMs: number; durationMs?: number } {
  const error = validateScheduleInput(input, now);
  if (error) throw new Error(error);

  if (input.startsAt !== undefined) {
    const startsAt = input.startsAt;
    let durationMs: number | undefined;
    let endsAt: number | undefined;

    if (input.endsAt !== undefined) {
      endsAt = input.endsAt;
      durationMs = endsAt - startsAt;
    } else if (input.durationMs !== undefined && input.durationMs > 0) {
      durationMs = input.durationMs;
      endsAt = startsAt + durationMs;
    }

    return {
      startsAt,
      endsAt,
      startDelayMs: Math.max(0, startsAt - now),
      durationMs,
    };
  }

  const startDelayMs = input.startDelayMs ?? 0;
  const startsAt = now + startDelayMs;
  const durationMs =
    input.durationMs !== undefined && input.durationMs > 0 ? input.durationMs : undefined;

  return {
    startsAt,
    endsAt: durationMs ? startsAt + durationMs : undefined,
    startDelayMs,
    durationMs,
  };
}

export function armQuizSchedule(
  input: SetScheduleInput,
  now: number,
  generation: number,
  questions: Pick<Question, 'id' | 'order'>[] = [],
): QuizSchedule {
  const times = resolveScheduleTimes(input, now);
  const mode = normalizeDeliveryMode(input.deliveryMode);
  const schedule = buildArmedSchedule(
    {
      startDelayMs: times.startDelayMs,
      durationMs: times.durationMs,
      runMode: input.runMode ?? (mode === 'self_paced' || mode === 'interval' ? 'manual' : 'assisted'),
      deliveryMode: mode,
      autoOpenFirstQuestion:
        mode === 'self_paced' || mode === 'interval' ? false : input.autoOpenFirstQuestion,
    },
    now,
    generation,
    times.startsAt,
    times.endsAt,
  );
  return attachIntervalWindowsToSchedule(schedule, questions);
}

/** `datetime-local` value in local timezone (YYYY-MM-DDTHH:mm). */
export function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): number {
  return new Date(value).getTime();
}

export function formatScheduleClock(ms: number, locale = 'nb-NO'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}
