/** Normalize join code from URL param or user input. */
export function normalizeJoinCode(raw: string | undefined): string {
  if (!raw) return '';
  try {
    return decodeURIComponent(raw).trim().toUpperCase();
  } catch {
    return raw.trim().toUpperCase();
  }
}

/** In-app path for participant join (QR / share links). */
export function buildParticipantJoinPath(joinCode: string): string {
  const code = normalizeJoinCode(joinCode);
  return code ? `/join/${encodeURIComponent(code)}` : '/join';
}

/** Full URL for QR codes and invitations — always targets the participant portal. */
export function buildParticipantJoinUrl(joinCode: string): string {
  return `${window.location.origin}${buildParticipantJoinPath(joinCode)}`;
}
