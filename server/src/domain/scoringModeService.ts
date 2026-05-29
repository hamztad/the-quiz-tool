import {
  canChangeScoringMode,
  type QuizScoringMode,
} from '@quiz-tool/shared';
import type { RoomRecord } from '../store/roomStoreTypes.js';

export function setScoringMode(room: RoomRecord, mode: QuizScoringMode): RoomRecord {
  const check = canChangeScoringMode(room);
  if (!check.ok) {
    throw new Error(check.message);
  }
  if (mode !== 'ranking' && mode !== 'performance') {
    throw new Error('Ugyldig poengmodus.');
  }
  return {
    ...room,
    settings: { ...room.settings, scoringMode: mode },
  };
}
