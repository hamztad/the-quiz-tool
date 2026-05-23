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

export function validateTeamName(raw: string): TeamNameValidationResult {
  const name = trimTeamName(raw);

  if (name.length < MIN_TEAM_NAME_LENGTH) {
    return { ok: false, message: 'Skriv inn et lagnavn.' };
  }

  if (name.length > MAX_TEAM_NAME_LENGTH) {
    return {
      ok: false,
      message: `Lagnavnet er for langt (maks ${MAX_TEAM_NAME_LENGTH} tegn).`,
    };
  }

  return { ok: true, name };
}
