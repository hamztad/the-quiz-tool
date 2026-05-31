import { describe, expect, it } from 'vitest';
import {
  buildMcDisplayOptionOrder,
  getParticipantMcOptions,
  moveMcOptionIds,
  orderMcOptionsByIds,
} from './mcParticipantOptions.js';

const options = [
  { id: 'a', text: 'A', isCorrect: true },
  { id: 'b', text: 'B', isCorrect: false },
  { id: 'c', text: 'C', isCorrect: false },
];

describe('mcParticipantOptions', () => {
  it('buildMcDisplayOptionOrder shuffles ids', () => {
    const order = buildMcDisplayOptionOrder(options, () => 0);
    expect(order).toHaveLength(3);
    expect(new Set(order)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('getParticipantMcOptions uses server order when shuffle enabled', () => {
    const shuffled = getParticipantMcOptions(
      { id: 'q1', type: 'mc', options, shuffleMcOptionsOnOpen: true },
      { q1: ['c', 'a', 'b'] },
    );
    expect(shuffled.map((o) => o.id)).toEqual(['c', 'a', 'b']);
  });

  it('getParticipantMcOptions keeps editor order when shuffle disabled', () => {
    const plain = getParticipantMcOptions(
      { id: 'q1', type: 'mc', options, shuffleMcOptionsOnOpen: false },
      { q1: ['c', 'a', 'b'] },
    );
    expect(plain.map((o) => o.id)).toEqual(['a', 'b', 'c']);
  });

  it('orderMcOptionsByIds appends missing ids', () => {
    expect(orderMcOptionsByIds(options, ['b']).map((o) => o.id)).toEqual(['b', 'a', 'c']);
  });

  it('moveMcOptionIds moves up and down', () => {
    expect(moveMcOptionIds(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveMcOptionIds(['a', 'b', 'c'], 0, -1)).toBeNull();
  });
});
