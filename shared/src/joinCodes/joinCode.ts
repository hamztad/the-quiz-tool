/** Fun, short Norwegian-friendly words for memorable join codes (WORD-WORD). */
export const JOIN_CODE_ADJECTIVES = [
  'RØD',
  'BLÅ',
  'GLAD',
  'SUPER',
  'DRAGE',
  'GULL',
  'MINI',
  'STOR',
  'KUL',
  'MODIG',
  'MYK',
  'FRISK',
  'RASK',
  'TURBO',
  'VILL',
  'SNØ',
  'EKTE',
  'LITEN',
  'GROV',
  'FIN',
  'LAV',
  'HØY',
  'VARM',
  'KALD',
  'SØT',
] as const;

export const JOIN_CODE_NOUNS = [
  'ELG',
  'TACO',
  'BANAN',
  'KAKE',
  'PAUSE',
  'QUIZ',
  'PANDA',
  'PIZZA',
  'BJØRN',
  'FISK',
  'KATT',
  'HUND',
  'MÅNE',
  'STJERNE',
  'BØLGE',
  'TROLL',
  'NINJA',
  'ROBOT',
  'KOMET',
  'VULKAN',
  'BLOMST',
  'PILOT',
  'ROCKET',
  'MUFFIN',
  'POTET',
  'OST',
  'LØK',
  'IS',
] as const;

/** Normalize user/URL input to canonical join code form (e.g. "glad taco" → "GLAD-TACO"). */
export function normalizeJoinCode(raw: string | undefined): string {
  if (!raw) return '';
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    text = raw;
  }
  return text
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Normalize for join-code lookup — removes spaces and hyphens so
 * "STOR-NINJA", "STOR NINJA" and "STORNINJA" all match.
 */
export function normalizeJoinCodeForMatch(raw: string | undefined): string {
  if (!raw) return '';
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    text = raw;
  }
  return text
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]+/g, '');
}

export function joinCodesMatch(a: string | undefined, b: string | undefined): boolean {
  const left = normalizeJoinCodeForMatch(a);
  const right = normalizeJoinCodeForMatch(b);
  return left.length > 0 && left === right;
}

export function formatJoinCodeForDisplay(code: string): string {
  return normalizeJoinCode(code);
}
