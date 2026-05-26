import { describe, expect, it } from 'vitest';
import {
  applyRainbowMove,
  connectedGroup,
  isRainbowBoardComplete,
  type RainbowBoard,
} from './rainbowPuzzleBoard.js';

describe('rainbowPuzzleBoard', () => {
  it('finds connected groups in four directions', () => {
    const board: RainbowBoard = [
      'red', 'red', 'blue',
      'red', 'blue', 'blue',
      'green', 'green', 'blue',
    ];

    expect(connectedGroup(board, 0, 3).sort((a, b) => a - b)).toEqual([0, 1, 3]);
  });

  it('changes adjacent connected groups and scores changed cells squared', () => {
    const board: RainbowBoard = [
      'red', 'blue', 'blue',
      'red', 'green', 'green',
      'yellow', 'yellow', 'green',
    ];

    const result = applyRainbowMove(board, 0, 3);

    expect(result.changedIndices.sort((a, b) => a - b)).toEqual([1, 2, 4, 5, 6, 7, 8]);
    expect(result.pointsEarned).toBe(49);
    expect(result.board[1]).toBe('red');
    expect(result.board[7]).toBe('red');
  });

  it('detects completed boards', () => {
    expect(isRainbowBoardComplete(['blue', 'blue', 'blue'])).toBe(true);
    expect(isRainbowBoardComplete(['blue', 'red', 'blue'])).toBe(false);
  });
});
