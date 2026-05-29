import type { RoomState } from '../types/room.js';

export type CanChangeScoringModeResult = { ok: true } | { ok: false; message: string };

export function canChangeScoringMode(
  room: Pick<RoomState, 'phase' | 'scores'>,
): CanChangeScoringModeResult {
  if (room.scores.length > 0) {
    return {
      ok: false,
      message: 'Kan ikke bytte poengmodus etter at poeng er registrert.',
    };
  }
  if (room.phase !== 'lobby') {
    return {
      ok: false,
      message: 'Poengmodus kan bare endres i lobby før quizen starter.',
    };
  }
  return { ok: true };
}

export function roomHasAnyScores(room: Pick<RoomState, 'scores'>): boolean {
  return room.scores.length > 0;
}
