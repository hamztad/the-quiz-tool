import type { Question } from '../types/room.js';
import type { GameId } from '../games/types.js';

export const AI_GENERATE_QUESTION_MIN = 2;
export const AI_GENERATE_QUESTION_MAX = 10;

export const AI_QUIZ_THEME_PRESETS = [
  'Allmennkunnskap',
  'Historie',
  'Geografi',
  'Sport',
  'Film og TV',
  'Musikk',
  'Natur og vitenskap',
  'Litteratur',
  'Mat og drikke',
] as const;

export type AiQuizThemePreset = (typeof AI_QUIZ_THEME_PRESETS)[number];

export const AI_QUIZ_CUSTOM_THEME = 'Egendefinert tema' as const;

export type AiQuizDifficulty = 'easy' | 'medium' | 'hard';

/** @deprecated Kun for eldre tester — bruk AiShopMode + slots. */
export type AiQuizQuestionStyle = 'open' | 'mc' | 'mixed' | 'quizPackage';
export type AiImageProvider = 'pixabay' | 'wikimedia' | 'upload';

export type AiShopMode = 'instant' | 'cart' | 'regnerace';

export type AiShopSlotType = 'open' | 'mc' | 'ordering' | 'game';

/** Rekkefølge i AI-shop: standard 4 elementer, minst 2. */
export const AI_SHOP_ORDERING_MIN_ITEMS = 2;
export const AI_SHOP_ORDERING_DEFAULT_ITEMS = 4;
export const AI_SHOP_ORDERING_MAX_ITEMS = 5;

export interface AiShopTypeThemes {
  open?: string;
  mc?: string;
  ordering?: string;
}

export interface AiShopSlot {
  type: AiShopSlotType;
  gameId?: GameId;
  /** Tema for denne oppgaven (åpen / MC / rekkefølge). */
  topic?: string;
  /** Antall elementer i rekkefølge-oppgave (2–5, standard 4). */
  orderingItemCount?: number;
}

export interface AiGenerateQuizRequest {
  roomId: string;
  mode: AiShopMode;
  questionCount: number;
  difficulty: AiQuizDifficulty;
  topic: string;
  slots?: AiShopSlot[];
  includePixabayImages?: boolean;
  imageProvider?: AiImageProvider;
  varietySeed?: string;
  /** @deprecated */
  questionStyle?: AiQuizQuestionStyle;
}

export interface AiGenerateQuizResponse {
  ok: true;
  questions: Omit<Question, 'id' | 'order'>[];
}

export interface AiGenerateQuizErrorResponse {
  ok: false;
  code: string;
  message: string;
}
