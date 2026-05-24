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
 * Places the correct MC option at `targetIndex` and shuffles distractors into the other slots.
 * `targetIndex` should cycle 0..n-1 across questions for even distribution in one quiz.
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
 * After AI parse: rotate correct-answer position across MC questions (0,1,2,3,0,…)
 * and shuffle wrong alternatives within each question.
 */
export function shuffleAiGeneratedMcOptions(
  questions: ParsedAiQuizQuestion[],
  random: () => number = Math.random,
): ParsedAiQuizQuestion[] {
  let mcIndex = 0;

  return questions.map((q) => {
    if (q.type !== 'mc' || !q.options?.length) {
      return q;
    }
    const options = arrangeMcOptionsWithCorrectAt(q.options, mcIndex, random);
    mcIndex++;
    return { ...q, options };
  });
}
