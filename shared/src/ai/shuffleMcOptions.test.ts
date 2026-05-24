import { describe, expect, it } from 'vitest';
import {
  arrangeMcOptionsWithCorrectAt,
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
  it('cycles correct position across eight MC questions', () => {
    const questions = Array.from({ length: 8 }, (_, i) => ({
      type: 'mc' as const,
      lines: [{ text: `Q${i}`, style: 'title' as const }],
      options: mcOptions(`Riktig ${i}`),
      maxPoints: 1,
    }));

    const shuffled = shuffleAiGeneratedMcOptions(questions, () => 0.5);
    const positions = shuffled.map(
      (q) => q.options!.findIndex((o) => o.isCorrect),
    );

    expect(positions).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
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
