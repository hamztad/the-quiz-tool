/** Deltaker-e-postvarsler (samtykkebasert, GDPR). */

export const TEAM_EMAIL_NOTIFY_MAX_LENGTH = 254;

export const TEAM_EMAIL_NOTIFY_CONSENT_VERSION = '2026-05-28-v1';

export const TEAM_EMAIL_NOTIFY_PURPOSE =
  'Sende deg en e-post når Gruizen avsluttes og/eller når endelig resultat er klart, med lenke tilbake til spilleren din.';

export const TEAM_EMAIL_NOTIFY_RETENTION =
  'E-postadressen lagres kun til denne Gruizen utløper eller du trekker samtykket tilbake.';

export const TEAM_EMAIL_NOTIFY_LEGAL_BASIS =
  'Behandlingen skjer på grunnlag av ditt samtykke (GDPR art. 6 nr. 1 bokstav a). Du kan når som helst trekke det tilbake.';

export type TeamEmailNotifyEvent = 'quiz_ended' | 'final_result_locked';

export interface TeamEmailNotifyPreferences {
  notifyOnQuizEnd: boolean;
  notifyOnFinalResult: boolean;
}

export interface ParticipantEmailNotifyStatus {
  registered: boolean;
  notifyOnQuizEnd: boolean;
  notifyOnFinalResult: boolean;
}

export type ValidateTeamEmailResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function normalizeTeamEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateTeamEmail(raw: string): ValidateTeamEmailResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: 'Skriv inn e-postadresse.' };
  }
  if (trimmed.length > TEAM_EMAIL_NOTIFY_MAX_LENGTH) {
    return { ok: false, message: 'E-postadressen er for lang.' };
  }
  const email = normalizeTeamEmail(trimmed);
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, message: 'Ugyldig e-postadresse.' };
  }
  return { ok: true, email };
}

export function toParticipantEmailNotifyStatus(
  record: TeamEmailNotifyPreferences | undefined,
): ParticipantEmailNotifyStatus {
  if (!record) {
    return { registered: false, notifyOnQuizEnd: false, notifyOnFinalResult: false };
  }
  return {
    registered: true,
    notifyOnQuizEnd: record.notifyOnQuizEnd,
    notifyOnFinalResult: record.notifyOnFinalResult,
  };
}
