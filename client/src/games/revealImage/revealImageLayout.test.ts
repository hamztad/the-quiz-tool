import { describe, expect, it } from 'vitest';
import { getRevealImageCanvasLayout, tileIndexFromCanvasPoint } from './revealImageLayout';

describe('revealImageLayout', () => {
  it('maps canvas clicks to grid tile indices', () => {
    const layout = getRevealImageCanvasLayout(300, 200, 600, 400, 4);
    const centerTile = tileIndexFromCanvasPoint(
      layout.offsetX + layout.tileWidth * 1.5,
      layout.offsetY + layout.tileHeight * 1.5,
      layout,
      4,
    );
    expect(centerTile).toBe(5);
  });

  it('returns null for clicks outside the image area', () => {
    const layout = getRevealImageCanvasLayout(300, 200, 600, 400, 4);
    expect(tileIndexFromCanvasPoint(0, 0, layout, 4)).toBeNull();
  });
});
