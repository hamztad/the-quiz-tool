import { describe, expect, it } from 'vitest';
import { moveOrderingIds } from './orderingListOrder';

describe('moveOrderingIds', () => {
  it('moves an id up', () => {
    expect(moveOrderingIds(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
  });

  it('moves an id down', () => {
    expect(moveOrderingIds(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });

  it('returns null when move is out of range', () => {
    expect(moveOrderingIds(['a', 'b'], 0, -1)).toBeNull();
    expect(moveOrderingIds(['a', 'b'], 1, 1)).toBeNull();
  });
});
