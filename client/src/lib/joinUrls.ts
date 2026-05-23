export { normalizeJoinCode } from '@quiz-tool/shared';

import { normalizeJoinCode } from '@quiz-tool/shared';

/** In-app path for participant join (QR / share links). */
export function buildParticipantJoinPath(joinCode: string): string {
  const code = normalizeJoinCode(joinCode);
  return code ? `/join/${encodeURIComponent(code)}` : '/join';
}

/** Full URL for QR codes and invitations — always targets the participant portal. */
export function buildParticipantJoinUrl(joinCode: string): string {
  return `${window.location.origin}${buildParticipantJoinPath(joinCode)}`;
}
