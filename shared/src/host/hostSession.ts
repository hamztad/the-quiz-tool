import type { RoomPhase } from '../types/room.js';
import type { QuizSchedule } from '../types/schedule.js';
import { isIntervalQuiz, isSelfPacedQuiz } from '../quiz/quizModes.js';

/** Extend manual/live room TTL from last server activity. */
export const LIVE_ROOM_ACTIVITY_EXTENSION_MS = 12 * 60 * 60_000;

export interface HostPresence {
  connected: boolean;
  lastSeenAt: number;
  disconnectedAt?: number;
}

export interface HostRoomSummary {
  roomId: string;
  joinCode: string;
  title: string;
  phase: RoomPhase;
  createdAt: number;
  lastActiveAt: number;
  hostConnected: boolean;
  schedule?: Pick<
    QuizSchedule,
    'enabled' | 'deliveryMode' | 'runMode' | 'startsAt' | 'endsAt' | 'completedAt'
  >;
  teamCount: number;
  questionCount: number;
}

export interface StoredHostSession {
  roomId: string;
  hostToken: string;
  title: string;
  joinCode?: string;
  createdAt: number;
  lastSeenAt: number;
}

export function deriveHostQuizTitle(
  joinCode: string,
  questions: Array<{ lines: Array<{ text: string; style: string }> }>,
  explicitTitle?: string,
): string {
  const trimmed = explicitTitle?.trim();
  if (trimmed) return trimmed.slice(0, 120);
  const firstTitle = questions.find((q) => q.lines[0]?.text.trim())?.lines[0]?.text.trim();
  if (firstTitle) return firstTitle.slice(0, 120);
  return `Quiz ${joinCode}`;
}

export function getHostSessionStatusLabel(
  summary: Pick<HostRoomSummary, 'phase' | 'schedule'>,
  now = Date.now(),
): string {
  if (summary.phase === 'ended') return 'Avsluttet';

  if (summary.schedule?.enabled) {
    if (summary.schedule.completedAt || summary.phase === 'post_quiz') {
      return 'Avsluttet';
    }
    if (summary.schedule.startsAt && now < summary.schedule.startsAt) {
      return 'Planlagt';
    }
    if (isSelfPacedQuiz(summary.schedule) || isIntervalQuiz(summary.schedule)) {
      return 'Selvgående';
    }
    if (summary.phase === 'live') return 'Pågår';
    return 'Planlagt';
  }

  if (summary.phase === 'post_quiz') return 'Avsluttet';
  if (summary.phase === 'lobby') return 'Venter på deltakere';
  if (summary.phase === 'live') return 'Pågår';
  if (summary.phase === 'grading') return 'Retterunde';
  if (summary.phase === 'leaderboard') return 'Leaderboard';
  return 'Aktiv';
}

export function touchRoomActivity<T extends { lastActiveAt: number; expiresAt: number; schedule?: QuizSchedule }>(
  room: T,
  now = Date.now(),
): T {
  const next = { ...room, lastActiveAt: now };
  if (!room.schedule?.enabled) {
    return {
      ...next,
      expiresAt: Math.max(next.expiresAt, now + LIVE_ROOM_ACTIVITY_EXTENSION_MS),
    };
  }
  return next;
}

export function shouldRemoveExpiredRoom(
  room: { expiresAt: number; phase: RoomPhase; schedule?: QuizSchedule },
  now = Date.now(),
): boolean {
  if (room.expiresAt > now) return false;
  return true;
}
