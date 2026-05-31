import { clampQuizPointsPerQuestion } from '../../scoring/quizScoring.js';
import type {
  AnagramGameConfig,
  AnagramSubmissionPayload,
  GameResult,
  GameSubmission,
} from '../types.js';

export const ANAGRAM_MAX_WORDS = 4;
export const ANAGRAM_MAX_LETTERS = 20;
/** Anbefalt maks per ord — lengre ord gir små fliser og linjebryt i spillet. */
export const ANAGRAM_RECOMMENDED_MAX_LETTERS_PER_WORD = 7;

export interface AnagramValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  normalizedText: string;
  letterCount: number;
  words: string[];
}

function hashStringToUint32(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function compactSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function lettersOnly(value: string): string {
  return Array.from(value.matchAll(/[\p{L}\p{N}]/gu), (match) => match[0]).join('');
}

export function normalizeAnagramAnswer(value: string): string {
  return compactSpaces(
    value
      .normalize('NFKC')
      .toLocaleLowerCase('nb-NO')
      .replace(/[^\p{L}\p{N}\s]+/gu, ' '),
  );
}

export function validateAnagramAnswerText(value: string): AnagramValidationResult {
  const normalizedText = compactSpaces(value.normalize('NFKC'));
  const words = normalizedText ? normalizedText.split(' ') : [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const letterCount = words.reduce((sum, word) => sum + lettersOnly(word).length, 0);

  if (words.length === 0) errors.push('Skriv inn svaret som skal løses.');
  if (words.length > ANAGRAM_MAX_WORDS) errors.push(`Maks ${ANAGRAM_MAX_WORDS} ord.`);
  if (letterCount > ANAGRAM_MAX_LETTERS) errors.push(`Maks ${ANAGRAM_MAX_LETTERS} bokstaver totalt.`);

  for (const word of words) {
    const wordLetters = lettersOnly(word).length;
    if (wordLetters < 2) {
      errors.push('Hvert ord må ha minst 2 bokstaver.');
      break;
    }
    if (wordLetters > ANAGRAM_RECOMMENDED_MAX_LETTERS_PER_WORD) {
      warnings.push(
        `Anbefalt maks ${ANAGRAM_RECOMMENDED_MAX_LETTERS_PER_WORD} bokstaver per ord — lengre ord gir små fliser, linjebryt og blir vanskelig å spille.`,
      );
      break;
    }
  }

  if (words.some((word) => new Set(lettersOnly(word).toLocaleLowerCase('nb-NO')).size < 2)) {
    warnings.push('Ett eller flere ord har for få ulike bokstaver til å stokkes godt.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalizedText,
    letterCount,
    words,
  };
}

function scrambleWord(word: string, random: () => number): string {
  const chars = Array.from(word);
  if (chars.length < 2) return word;

  const original = word;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const shuffled = [...chars];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const candidate = shuffled.join('');
    if (candidate !== original) return candidate;
  }

  const reversed = [...chars].reverse().join('');
  return reversed !== original ? reversed : original;
}

export function scrambleAnagramText(value: string, seed = hashStringToUint32(value)): string {
  const validation = validateAnagramAnswerText(value);
  const random = mulberry32(seed);
  return validation.words.map((word) => scrambleWord(word, random)).join(' ');
}

export function createDefaultAnagramConfig(): AnagramGameConfig {
  return {
    gameId: 'anagram',
    title: 'Anagram',
    instructions: 'Løs anagrammet før Gruizmaster låser spørsmålet.',
    mode: 'classic',
    shuffleMode: 'perWord',
    answerText: '',
    scrambledText: '',
    rankingMode: 'highest',
    resultKind: 'directScore',
    pointMode: 'directScoreToPoints',
  };
}

export function createAnagramConfigForAnswer(answerText: string): AnagramGameConfig {
  const normalizedText = validateAnagramAnswerText(answerText).normalizedText;
  return {
    ...createDefaultAnagramConfig(),
    answerText: normalizedText,
    scrambledText: scrambleAnagramText(normalizedText),
  };
}

export function isAnagramSubmissionPayload(
  payload: unknown,
): payload is AnagramSubmissionPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return record.gameId === 'anagram' && typeof record.answer === 'string';
}

export function isAnagramAnswerCorrect(answer: string, expected: string): boolean {
  return normalizeAnagramAnswer(answer) === normalizeAnagramAnswer(expected);
}

export function buildAnagramResults(
  questionId: string,
  maxPoints: number,
  config: AnagramGameConfig,
  submissions: GameSubmission[],
): GameResult[] {
  const latestByTeam = new Map<string, AnagramSubmissionPayload>();

  for (const submission of submissions) {
    if (!isAnagramSubmissionPayload(submission.payload)) continue;
    latestByTeam.set(submission.teamId, submission.payload);
  }

  return Array.from(latestByTeam.entries()).map(([teamId, payload]) => {
    const correct = isAnagramAnswerCorrect(payload.answer, config.answerText);
    return {
      questionId,
      teamId,
      gameId: 'anagram',
      rankValue: correct ? 1 : 0,
      displayValue: correct ? 'Riktig svar' : 'Feil svar',
      rank: 0,
      quizPoints: correct ? clampQuizPointsPerQuestion(maxPoints) : 0,
      status: 'ranked' as const,
    };
  });
}
