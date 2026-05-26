import type { RainbowPuzzleColor } from '@quiz-tool/shared';

export type { RainbowPuzzleColor };

export type RainbowBoard = RainbowPuzzleColor[];

export interface RainbowMoveResult {
  board: RainbowBoard;
  changedIndices: number[];
  pointsEarned: number;
}
