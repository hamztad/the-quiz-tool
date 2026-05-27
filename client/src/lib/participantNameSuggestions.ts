const EMOJIS = [
  '🦁',
  '🐯',
  '🦊',
  '🐻',
  '🐼',
  '🦄',
  '🐸',
  '🐙',
  '🦋',
  '🐬',
  '🦅',
  '🐧',
  '🐺',
  '🦉',
  '🐝',
  '🦈',
  '🐢',
  '🦖',
  '🎮',
  '🎯',
  '🏆',
  '⚡',
  '🔥',
  '✨',
  '🌟',
  '🚀',
  '🎲',
  '🎪',
  '🎸',
  '🎨',
  '🌈',
  '☀️',
  '🌙',
  '🍀',
  '🎈',
  '🧠',
  '👑',
  '🛸',
  '🦸',
  '🧩',
  '🎭',
] as const;

const PREFIXES = [
  'Rask',
  'Modig',
  'Glad',
  'Sterk',
  'Lyn',
  'Troll',
  'Vill',
  'Snill',
  'Tøff',
  'Klok',
  'Rød',
  'Blå',
  'Gul',
  'Grønn',
  'Gull',
  'Stille',
  'Liten',
  'Stor',
  'Mystisk',
  'Koselig',
  'Gal',
  'Super',
  'Mini',
  'Turbo',
  'Ninja',
  'Viking',
  'Rom',
] as const;

const SUFFIXES = [
  'Løve',
  'Ulv',
  'Bjørn',
  'Rev',
  'Ørn',
  'Hai',
  'Elg',
  'Rype',
  'Gjeng',
  'Bande',
  'Klan',
  'Lag',
  'Hold',
  'Stjerne',
  'Torden',
  'Blitz',
  'Boble',
  'Kompass',
  'Rakett',
  'Panda',
  'Tiger',
  'Delfin',
  'Kriger',
  'Detektiv',
  'Kaptein',
  'Pilot',
  'Guru',
  'Ninja',
  'Viking',
  'Ekspert',
  'Mester',
  'Geni',
  'Helt',
  'Drage',
  'Fantom',
  'Orakel',
  'Pioner',
] as const;

const SOLO_NAMES = [
  'Quizkongen',
  'Quizdronningen',
  'Oraklet',
  'Tordenen',
  'Stjerneskudd',
  'Lyspære',
  'Terningen',
  'Kompasset',
  'Raketten',
  'Trollmannen',
  'Eventyreren',
  'Oppdageren',
  'Kaptein Boble',
  'Supernova',
  'Nordlyset',
] as const;

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function capitalizeWord(word: string): string {
  if (!word) return '';
  const lower = word.toLocaleLowerCase('nb-NO');
  return lower.charAt(0).toLocaleUpperCase('nb-NO') + lower.slice(1);
}

function buildCompoundName(): string {
  if (Math.random() < 0.35) {
    return capitalizeWord(pick(SOLO_NAMES));
  }
  return `${capitalizeWord(pick(PREFIXES))} ${capitalizeWord(pick(SUFFIXES))}`;
}

/**
 * Suggested display name: emoji + space + title-cased label (max ~40 chars label for room limits).
 */
export function suggestParticipantName(): string {
  const emoji = pick(EMOJIS);
  let label = buildCompoundName();
  const maxLabelLen = 40;
  if (label.length > maxLabelLen) {
    label = label.slice(0, maxLabelLen).trim();
  }
  return `${emoji} ${label}`;
}

/** Uppercase typed names; emoji and punctuation are unchanged. */
export function formatParticipantNameInput(raw: string): string {
  return raw.toLocaleUpperCase('nb-NO');
}
