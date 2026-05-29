import { describe, expect, it } from 'vitest';
import {
  createDropBallBoardLayout,
  isDropBallLaunchClear,
} from './dropBallBoardLayout';

const CANVAS_WIDTH = 340;

describe('dropBallBoardLayout', () => {
  it('generates distinct layouts per seed and board', () => {
    const boardA = createDropBallBoardLayout(42, 0, 14, [1000, 2000, 3000]);
    const boardB = createDropBallBoardLayout(42, 1, 14, [1000, 2000, 3000]);
    const otherSeed = createDropBallBoardLayout(99, 0, 14, [1000, 2000, 3000]);

    expect(boardA.bumpers).toHaveLength(14);
    expect(boardA.coins).toHaveLength(3);
    expect(boardA.bumpers[0]?.width).not.toBe(boardB.bumpers[0]?.width);
    expect(boardA.bumpers[0]?.angle).not.toBe(otherSeed.bumpers[0]?.angle);
  });

  it('keeps center launch lane clear', () => {
    const layout = createDropBallBoardLayout(7, 0, 14, [1000, 2000, 3000]);
    expect(isDropBallLaunchClear(layout, CANVAS_WIDTH / 2)).toBe(true);
  });
});
