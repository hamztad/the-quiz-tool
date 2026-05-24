import type { McOption } from '../types/room.js';
import type { ParsedAiQuizQuestion } from './parseAiQuizJson.js';

/** Fisher–Yates shuffle (in place on copy). */
export function shuffleArray<T>(items: T[], random: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Builds a length-`count` list of slot indices 0..slotCount-1 with near-equal counts, then shuffles.
 * E.g. eight questions / four slots → two of each position, in random order.
 */
export function buildBalancedCorrectPositions(
  count: number,
  slotCount: number,
  random: () => number = Math.random,
): number[] {
  if (count <= 0 || slotCount <= 0) return [];
  const positions = Array.from({ length: count }, (_, i) => i % slotCount);
  return shuffleArray(positions, random);
}

/**
 * Places the correct MC option at `targetIndex` and shuffles distractors into the other slots.
 */
export function arrangeMcOptionsWithCorrectAt(
  options: McOption[],
  targetIndex: number,
  random: () => number = Math.random,
): McOption[] {
  const n = options.length;
  if (n === 0) return options;

  const correct = options.find((o) => o.isCorrect);
  if (!correct) return options;

  const incorrect = shuffleArray(
    options.filter((o) => !o.isCorrect),
    random,
  );
  const slot = ((targetIndex % n) + n) % n;

  const arranged: McOption[] = [];
  let wrongIdx = 0;
  for (let i = 0; i < n; i++) {
    if (i === slot) {
      arranged.push(correct);
    } else {
      arranged.push(incorrect[wrongIdx]!);
      wrongIdx++;
    }
  }
  return arranged;
}

/**
 * After AI parse: assign correct-answer slots from a shuffled, balanced list (even A/B/C/D spread,
 * unpredictable order) and shuffle wrong alternatives within each question.
 */
export function shuffleAiGeneratedMcOptions(
  questions: ParsedAiQuizQuestion[],
  random: () => number = Math.random,
): ParsedAiQuizQuestion[] {
  const mcSlotCounts: number[] = [];
  for (const q of questions) {
    if (q.type === 'mc' && q.options?.length) {
      mcSlotCounts.push(q.options.length);
    }
  }

  const slotCount = mcSlotCounts.length > 0 ? Math.max(...mcSlotCounts) : 4;
  const targetPositions = buildBalancedCorrectPositions(mcSlotCounts.length, slotCount, random);
  let mcOrdinal = 0;

  return questions.map((q) => {
    if (q.type !== 'mc' || !q.options?.length) {
      return q;
    }
    const target = targetPositions[mcOrdinal] ?? 0;
    mcOrdinal++;
    const options = arrangeMcOptionsWithCorrectAt(q.options, target, random);
    return { ...q, options };
  });
}
