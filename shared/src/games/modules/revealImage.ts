import type {
  GameResult,
  GameSubmission,
  RevealImageChoiceOption,
  RevealImageClientAnswerPayload,
  RevealImageConfig,
  RevealImageSubmissionPayload,
} from '../types.js';

function localId() {
  return `reveal_${Math.random().toString(36).slice(2, 10)}`;
}

export const DEFAULT_REVEAL_IMAGE_GRID_SIZE = 5;
export const DEFAULT_REVEAL_IMAGE_MAX_POINTS = 100;
export const DEFAULT_REVEAL_IMAGE_CHOICE_MULTIPLIER = 0.6;
export const DEFAULT_REVEAL_IMAGE_MIN_SCORE = 10;

/** Seeded opaque HSL colors — one per tile, varied per game session. */
export function generateRevealImageTileColors(totalTiles: number, seed: string): string[] {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 31 + seed.charCodeAt(i)) | 0;
  }
  const next = () => {
    state = (state * 1103515245 + 12345) | 0;
    return ((state >>> 16) & 0x7fff) / 0x7fff;
  };
  const colors: string[] = [];
  for (let i = 0; i < totalTiles; i += 1) {
    const hue = Math.floor(next() * 360);
    const saturation = 58 + Math.floor(next() * 22);
    const lightness = 38 + Math.floor(next() * 16);
    colors.push(`hsl(${hue} ${saturation}% ${lightness}%)`);
  }
  return colors;
}

export function normalizeRevealImageAnswer(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('nb-NO')
    .trim()
    .replace(/\s+/g, ' ');
}

function uniqueAnswers(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const normalized = normalizeRevealImageAnswer(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(value.trim());
  }
  return out;
}

export function createDefaultRevealImageConfig(): RevealImageConfig {
  return {
    gameId: 'revealImage',
    title: 'Avslør bildet',
    instructions: 'Åpne færrest mulig ruter og gjett motivet.',
    gridSize: DEFAULT_REVEAL_IMAGE_GRID_SIZE,
    correctAnswer: '',
    acceptedAnswers: [],
    choices: [
      { id: localId(), text: '', isCorrect: true },
      { id: localId(), text: '', isCorrect: false },
      { id: localId(), text: '', isCorrect: false },
    ],
    choiceMultiplier: DEFAULT_REVEAL_IMAGE_CHOICE_MULTIPLIER,
    minCorrectScore: DEFAULT_REVEAL_IMAGE_MIN_SCORE,
    rankingMode: 'highest',
    resultKind: 'directScore',
    pointMode: 'directScoreToPoints',
  };
}

export function sanitizeRevealImageChoices(choices: RevealImageChoiceOption[] | undefined): RevealImageChoiceOption[] | undefined {
  if (!choices || choices.length === 0) return undefined;
  const trimmed = choices
    .map((choice) => ({
      ...choice,
      text: choice.text.trim(),
    }))
    .filter((choice) => choice.text.length > 0);
  if (trimmed.length < 3) return undefined;
  const unique = new Set(trimmed.map((choice) => normalizeRevealImageAnswer(choice.text)));
  if (unique.size !== trimmed.length) return undefined;
  if (trimmed.length > 5) return trimmed.slice(0, 5);
  const hasCorrect = trimmed.some((choice) => choice.isCorrect);
  return hasCorrect ? trimmed : trimmed.map((choice, index) => ({ ...choice, isCorrect: index === 0 }));
}

export function isRevealImageAnswerCorrect(answer: string, config: RevealImageConfig): boolean {
  const normalized = normalizeRevealImageAnswer(answer);
  if (!normalized) return false;
  const allAccepted = uniqueAnswers([config.correctAnswer, ...config.acceptedAnswers]);
  return allAccepted.some((candidate) => normalizeRevealImageAnswer(candidate) === normalized);
}

export function calculateRevealImageScore(params: {
  maxPoints: number;
  totalTiles: number;
  openedTiles: number;
  usedChoices: boolean;
  choiceMultiplier: number;
  minCorrectScore: number;
}): number {
  const totalTiles = Math.max(1, Math.round(params.totalTiles));
  const openedTiles = Math.max(0, Math.min(totalTiles, Math.round(params.openedTiles)));
  const ratio = Math.max(0, 1 - openedTiles / totalTiles);
  const multiplier = params.usedChoices ? params.choiceMultiplier : 1;
  const raw = Math.round(Math.max(0, params.maxPoints) * Math.max(0, multiplier) * ratio);
  return Math.max(Math.max(0, Math.round(params.minCorrectScore)), raw);
}

export function isRevealImageClientAnswerPayload(
  payload: unknown,
): payload is RevealImageClientAnswerPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return (
    record.gameId === 'revealImage' &&
    typeof record.answer === 'string' &&
    (record.source === 'text' || record.source === 'choice') &&
    (record.choiceId === undefined || typeof record.choiceId === 'string')
  );
}

export function isRevealImageSubmissionPayload(payload: unknown): payload is RevealImageSubmissionPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return (
    record.gameId === 'revealImage' &&
    typeof record.answer === 'string' &&
    typeof record.openedTiles === 'number' &&
    typeof record.totalTiles === 'number' &&
    typeof record.usedChoices === 'boolean' &&
    (record.source === 'text' || record.source === 'choice')
  );
}

export function buildRevealImageResults(
  questionId: string,
  maxPoints: number,
  config: RevealImageConfig,
  submissions: GameSubmission[],
): GameResult[] {
  const bestByTeam = new Map<string, { score: number; openedTiles: number; usedChoices: boolean; answer: string }>();

  for (const submission of submissions) {
    if (!isRevealImageSubmissionPayload(submission.payload)) continue;
    if (!isRevealImageAnswerCorrect(submission.payload.answer, config)) continue;
    const score = calculateRevealImageScore({
      maxPoints,
      totalTiles: submission.payload.totalTiles,
      openedTiles: submission.payload.openedTiles,
      usedChoices: submission.payload.usedChoices,
      choiceMultiplier: config.choiceMultiplier,
      minCorrectScore: config.minCorrectScore,
    });
    const prev = bestByTeam.get(submission.teamId);
    if (!prev || score > prev.score) {
      bestByTeam.set(submission.teamId, {
        score,
        openedTiles: submission.payload.openedTiles,
        usedChoices: submission.payload.usedChoices,
        answer: submission.payload.answer,
      });
    }
  }

  return Array.from(bestByTeam.entries()).map(([teamId, best]) => ({
    questionId,
    teamId,
    gameId: 'revealImage',
    rankValue: best.score,
    displayValue: `${best.openedTiles} ruter · ${best.usedChoices ? 'alternativer brukt' : 'fritekst'}`,
    rank: 0,
    quizPoints: best.score,
    status: 'ranked',
  }));
}
