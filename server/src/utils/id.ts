import { randomBytes } from 'crypto';
import { JOIN_CODE_ADJECTIVES, JOIN_CODE_NOUNS } from '@quiz-tool/shared';

export function generateId(prefix = ''): string {
  const id = randomBytes(8).toString('hex');
  return prefix ? `${prefix}_${id}` : id;
}

function pickWord<T extends readonly string[]>(words: T): T[number] {
  const index = randomBytes(1)[0] % words.length;
  return words[index];
}

/** Memorable two-word code, e.g. RØD-ELG or GLAD-TACO */
export function generateJoinCode(): string {
  return `${pickWord(JOIN_CODE_ADJECTIVES)}-${pickWord(JOIN_CODE_NOUNS)}`;
}

export function generateToken(): string {
  return randomBytes(24).toString('hex');
}
