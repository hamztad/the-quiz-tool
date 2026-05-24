import { describe, expect, it } from 'vitest';
import {
  arrangeMcOptionsWithCorrectAt,
  buildBalancedCorrectPositions,
  shuffleAiGeneratedMcOptions,
} from './shuffleMcOptions.js';

function mcOptions(correctText: string) {
  return [
    { id: 'a', text: correctText, isCorrect: true },
    { id: 'b', text: 'Feil B', isCorrect: false },
    { id: 'c', text: 'Feil C', isCorrect: false },
    { id: 'd', text: 'Feil D', isCorrect: false },
  ];
}

/** Simple LCG for deterministic tests. */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe('buildBalancedCorrectPositions', () => {
  it('contains equal counts per slot when count is a multiple of slotCount', () => {
    const positions = buildBalancedCorrectPositions(8, 4, createSeededRandom(42));
    expect(positions).toHaveLength(8);
    for (let slot = 0; slot < 4; slot++) {
      expect(positions.filter((p) => p === slot)).toHaveLength(2);
    }
  });

  it('does not return sequential rotation order after shuffle', () => {
    const positions = buildBalancedCorrectPositions(8, 4, createSeededRandom(99));
    expect(positions).not.toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  });
});

describe('arrangeMcOptionsWithCorrectAt', () => {
  it('places correct answer at the requested index', () => {
    for (let target = 0; target < 4; target++) {
      const arranged = arrangeMcOptionsWithCorrectAt(mcOptions('Riktig'), target, () => 0);
      expect(arranged[target]?.isCorrect).toBe(true);
      expect(arranged[target]?.text).toBe('Riktig');
      expect(arranged.filter((o) => o.isCorrect)).toHaveLength(1);
    }
  });
});

describe('shuffleAiGeneratedMcOptions', () => {
  it('distributes correct positions evenly across eight MC questions', () => {
    const questions = Array.from({ length: 8 }, (_, i) => ({
      type: 'mc' as const,
      lines: [{ text: `Q${i}`, style: 'title' as const }],
      options: mcOptions(`Riktig ${i}`),
      maxPoints: 1,
    }));

    const random = createSeededRandom(7);
    const shuffled = shuffleAiGeneratedMcOptions(questions, random);
    const positions = shuffled.map((q) => q.options!.findIndex((o) => o.isCorrect));

    for (let slot = 0; slot < 4; slot++) {
      expect(positions.filter((p) => p === slot)).toHaveLength(2);
    }
  });

  it('does not use fixed 0,1,2,3 rotation order', () => {
    const questions = Array.from({ length: 8 }, (_, i) => ({
      type: 'mc' as const,
      lines: [{ text: `Q${i}`, style: 'title' as const }],
      options: mcOptions(`Riktig ${i}`),
      maxPoints: 1,
    }));

    const positions = shuffleAiGeneratedMcOptions(questions, createSeededRandom(123)).map(
      (q) => q.options!.findIndex((o) => o.isCorrect),
    );

    expect(positions).not.toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  });

  it('leaves open questions unchanged', () => {
    const questions = [
      {
        type: 'open' as const,
        lines: [{ text: 'Q', style: 'title' as const }],
        acceptedAnswers: ['A'],
        maxPoints: 1,
      },
    ];
    expect(shuffleAiGeneratedMcOptions(questions)).toEqual(questions);
  });
});
