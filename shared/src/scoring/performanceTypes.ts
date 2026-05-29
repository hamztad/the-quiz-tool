export type PerformanceCurve =
  | { kind: 'linear'; benchmark: number; minRatio?: number }
  | { kind: 'power'; benchmark: number; exponent: number }
  | { kind: 'inverse_exp'; perfectRaw: number; decayK: number; zeroAbove?: number }
  | { kind: 'fixed'; correct: number; incorrect: number }
  | { kind: 'attempt_decay'; decay: number; floor: number }
  | {
      kind: 'reveal_decay';
      openedRatio: number;
      ceiling: number;
      exponent: number;
      minScore: number;
      correct: boolean;
    };
