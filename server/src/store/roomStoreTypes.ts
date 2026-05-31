import type { HostPresence, RoomState, TeamEmailNotifyPreferences } from '@quiz-tool/shared';

/** Server-only: e-postvarsler per lag (GDPR — slettes med rom/lag). */
export interface TeamEmailNotifyRecord extends TeamEmailNotifyPreferences {
  email: string;
  consentedAt: number;
  consentVersion: string;
  resultAccessToken: string;
  quizEndSentAt?: number;
  finalResultSentAt?: number;
}

export interface RoomRecord extends RoomState {
  teamEmailNotify?: Record<string, TeamEmailNotifyRecord>;
  hostToken: string;
  teamTokens: Record<string, string>;
  teamBrowserTokens: Record<string, string>;
  /** Unix ms — room is removed from active use after this time */
  expiresAt: number;
  createdAt: number;
  lastActiveAt: number;
  hostTitle?: string;
  hostPresence: HostPresence;
}

export interface RoomStore {
  create(room: RoomRecord): void;
  get(roomId: string): RoomRecord | undefined;
  getByJoinCode(joinCode: string): RoomRecord | undefined;
  list(): RoomRecord[];
  update(roomId: string, updater: (room: RoomRecord) => RoomRecord): RoomRecord | undefined;
  delete(roomId: string): void;
}
