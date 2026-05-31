import {
  TEAM_EMAIL_NOTIFY_CONSENT_VERSION,
  validateTeamEmail,
  type TeamEmailNotifyEvent,
} from '@quiz-tool/shared';
import type { RoomRecord } from '../store/roomStoreTypes.js';
import type { TeamEmailNotifyRecord } from '../store/roomStoreTypes.js';
import { generateToken } from '../utils/id.js';

export function findTeamIdByResultAccessToken(
  room: RoomRecord,
  token: string | undefined,
): string | null {
  if (!token?.trim() || !room.teamEmailNotify) return null;
  const trimmed = token.trim();
  for (const [teamId, record] of Object.entries(room.teamEmailNotify)) {
    if (record.resultAccessToken === trimmed) return teamId;
  }
  return null;
}

export function setTeamEmailNotify(
  room: RoomRecord,
  teamId: string,
  payload: {
    email: string;
    consent: boolean;
    notifyOnQuizEnd: boolean;
    notifyOnFinalResult: boolean;
  },
): RoomRecord {
  if (!payload.consent) {
    throw new Error('Du må gi samtykke for å motta e-postvarsler.');
  }
  if (!payload.notifyOnQuizEnd && !payload.notifyOnFinalResult) {
    throw new Error('Velg minst én type varsel.');
  }
  const validated = validateTeamEmail(payload.email);
  if (!validated.ok) {
    throw new Error(validated.message);
  }
  if (!room.teams.some((team) => team.id === teamId)) {
    throw new Error('Spilleren finnes ikke i dette rommet.');
  }

  const existing = room.teamEmailNotify?.[teamId];
  const record: TeamEmailNotifyRecord = {
    email: validated.email,
    consentedAt: Date.now(),
    consentVersion: TEAM_EMAIL_NOTIFY_CONSENT_VERSION,
    notifyOnQuizEnd: payload.notifyOnQuizEnd,
    notifyOnFinalResult: payload.notifyOnFinalResult,
    resultAccessToken: existing?.resultAccessToken ?? generateToken(),
    quizEndSentAt: existing?.quizEndSentAt,
    finalResultSentAt: existing?.finalResultSentAt,
  };

  return {
    ...room,
    teamEmailNotify: {
      ...room.teamEmailNotify,
      [teamId]: record,
    },
  };
}

export function withdrawTeamEmailNotify(room: RoomRecord, teamId: string): RoomRecord {
  if (!room.teamEmailNotify?.[teamId]) {
    return room;
  }
  const next = { ...room.teamEmailNotify };
  delete next[teamId];
  return {
    ...room,
    teamEmailNotify: Object.keys(next).length > 0 ? next : undefined,
  };
}

export function clearTeamEmailNotifyForTeam(room: RoomRecord, teamId: string): RoomRecord {
  return withdrawTeamEmailNotify(room, teamId);
}

export function markTeamEmailNotifySent(
  room: RoomRecord,
  teamId: string,
  event: TeamEmailNotifyEvent,
): RoomRecord {
  const record = room.teamEmailNotify?.[teamId];
  if (!record) return room;
  const updated: TeamEmailNotifyRecord = {
    ...record,
    ...(event === 'quiz_ended'
      ? { quizEndSentAt: Date.now() }
      : { finalResultSentAt: Date.now() }),
  };
  return {
    ...room,
    teamEmailNotify: { ...room.teamEmailNotify, [teamId]: updated },
  };
}

export function teamsEligibleForEmailNotify(
  room: RoomRecord,
  event: TeamEmailNotifyEvent,
): Array<{ teamId: string; record: TeamEmailNotifyRecord }> {
  const entries = Object.entries(room.teamEmailNotify ?? {});
  return entries
    .filter(([teamId, record]) => {
      if (!room.teams.some((team) => team.id === teamId)) return false;
      if (event === 'quiz_ended') {
        return record.notifyOnQuizEnd && !record.quizEndSentAt;
      }
      return record.notifyOnFinalResult && !record.finalResultSentAt;
    })
    .map(([teamId, record]) => ({ teamId, record }));
}
