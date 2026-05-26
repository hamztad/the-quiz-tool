import type {
  GameQuestionConfig,
  GameResult,
  GameRound,
  GameSubmission,
} from '../games/types.js';

export type QuestionType = 'open' | 'mc' | 'game';

export interface QuestionLine {
  text: string;
  style: 'title' | 'body';
}

export interface MediaAttachment {
  type: 'image';
  /** Remote image URL selected through the backend Pixabay search proxy. */
  url: string;
  alt?: string;
  source?: 'pixabay';
  /** Small preview URL when source provides one, e.g. Pixabay thumbnails. */
  previewUrl?: string;
  photographer?: string;
  pageUrl?: string;
}

export interface McOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  order: number;
  type: QuestionType;
  lines: QuestionLine[];
  hint?: string;
  acceptedAnswers?: string[];
  options?: McOption[];
  game?: GameQuestionConfig;
  media?: MediaAttachment[];
  maxPoints: number;
}

export type QuestionStatus = 'locked' | 'open';

export interface Team {
  id: string;
  name: string;
}

export interface Answer {
  teamId: string;
  questionId: string;
  value: string;
  updatedAt: number;
}

export interface PeerGrade {
  graderTeamId: string;
  targetTeamId: string;
  questionId: string;
  points: number;
  submittedAt: number;
}

export interface ScoreEntry {
  teamId: string;
  questionId: string;
  points: number;
  source: 'auto' | 'peer' | 'override' | 'game';
}

export interface Protest {
  id: string;
  roomId?: string;
  teamId: string;
  questionId: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  awardedPoints?: number;
  submittedAnswer?: string;
  createdAt?: number;
}

export interface GradingAssignment {
  graderTeamId: string;
  targetTeamId: string;
  questionIds: string[];
}

export type RoomPhase = 'lobby' | 'live' | 'grading' | 'leaderboard' | 'post_quiz' | 'ended';

export interface RoomSettings {
  showLeaderboard: boolean;
  teamReviewOpen: boolean;
  answerKeyOpen: boolean;
}

export interface RoomState {
  id: string;
  joinCode: string;
  phase: RoomPhase;
  teams: Team[];
  questions: Question[];
  questionStatus: Record<string, QuestionStatus>;
  /** True once quizmaster has opened the question at least once (teams may see text after). */
  questionsActivated: Record<string, boolean>;
  answeredByTeam: Record<string, string[]>;
  answers: Answer[];
  gameRounds: GameRound[];
  gameSubmissions: GameSubmission[];
  gameResults: GameResult[];
  scores: ScoreEntry[];
  gradingAssignments: GradingAssignment[];
  peerGrades: PeerGrade[];
  protests: Protest[];
  settings: RoomSettings;
}

export type SocketRole = 'host' | 'secretary';

export interface PublicRoomState extends RoomState {
  viewerTeamId?: string;
  viewerRole: SocketRole;
  leaderboard?: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  totalPoints: number;
}
