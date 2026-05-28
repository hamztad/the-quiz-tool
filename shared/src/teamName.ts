import { NB, RESERVED_TEST_PARTICIPANT_NAME } from './copy/nbParticipant.js';

export const MIN_TEAM_NAME_LENGTH = 1;
/** Reasonable upper bound — validated on submit, not while typing. */
export const MAX_TEAM_NAME_LENGTH = 50;

export type TeamNameValidationResult =
  | { ok: true; name: string }
  | { ok: false; message: string };

/** Trim surrounding whitespace — use on submit only, not while typing. */
export function trimTeamName(raw: string): string {
  return raw.trim();
}

/** Canonical form for duplicate checks (trim + collapse spaces + lowercase). */
export function canonicalTeamName(raw: string): string {
  return trimTeamName(raw).replace(/\s+/g, ' ').toLocaleLowerCase('nb');
}

export function validateTeamName(
  raw: string,
  options?: { allowReservedTestName?: boolean },
): TeamNameValidationResult {
  const name = trimTeamName(raw);

  if (name.length < MIN_TEAM_NAME_LENGTH) {
    return { ok: false, message: NB.participantNameRequired };
  }

  if (name.length > MAX_TEAM_NAME_LENGTH) {
    return {
      ok: false,
      message: NB.participantNameTooLong(MAX_TEAM_NAME_LENGTH),
    };
  }

  if (
    !options?.allowReservedTestName &&
    name.localeCompare(RESERVED_TEST_PARTICIPANT_NAME, 'nb', { sensitivity: 'accent' }) === 0
  ) {
    return { ok: false, message: NB.reservedTestName };
  }

  return { ok: true, name };
}
