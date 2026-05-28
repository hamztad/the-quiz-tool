import type { QuizSchedule } from '@quiz-tool/shared';
import type { RoomPhase } from '@quiz-tool/shared';

type ScheduleLifecycleEvent =
  | 'schedule_armed'
  | 'schedule_cancelled'
  | 'schedule_start_applied'
  | 'schedule_end_applied'
  | 'schedule_catch_up'
  | 'schedule_bootstrap'
  | 'schedule_sweep'
  | 'room_expires_extended';

function formatSchedule(schedule: QuizSchedule | undefined): string {
  if (!schedule?.enabled) return 'none';
  const start = schedule.startsAt ? new Date(schedule.startsAt).toISOString() : '?';
  const end = schedule.endsAt ? new Date(schedule.endsAt).toISOString() : 'open';
  return `${schedule.deliveryMode ?? 'qm_led'} start=${start} end=${end} gen=${schedule.generation ?? 0}`;
}

export function logScheduleLifecycle(
  event: ScheduleLifecycleEvent,
  details: {
    roomId: string;
    phase?: RoomPhase;
    schedule?: QuizSchedule;
    expiresAt?: number;
    note?: string;
  },
): void {
  const parts = [
    `[schedule] ${event}`,
    `room=${details.roomId}`,
    details.phase ? `phase=${details.phase}` : null,
    details.schedule ? `schedule=${formatSchedule(details.schedule)}` : null,
    details.expiresAt ? `expiresAt=${new Date(details.expiresAt).toISOString()}` : null,
    details.note ? `note=${details.note}` : null,
  ].filter(Boolean);
  console.log(parts.join(' '));
}
