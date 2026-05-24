import type { Question } from '../types/room.js';

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

export type AiQuizQuestionStyle = 'open' | 'mc' | 'mixed';

export interface AiGenerateQuizRequest {
  roomId: string;
  topic: string;
  questionCount: number;
  difficulty: AiQuizDifficulty;
  questionStyle: AiQuizQuestionStyle;
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
