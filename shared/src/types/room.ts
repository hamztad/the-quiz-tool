import type {
  GameId,
  GameQuestionConfig,
  GameResult,
  GameRound,
  GameSubmission,
  GameTeamStart,
} from '../games/types.js';
import type {
  ActiveQuestionTimer,
  QuestionTimerConfig,
  QuizSchedule,
} from './schedule.js';

export type QuestionType = 'open' | 'mc' | 'ordering' | 'game';

export interface QuestionLine {
  text: string;
  style: 'title' | 'body';
}

export interface MediaAttachment {
  type: 'image';
  /** Remote image URL selected through backend image provider search/upload. */
  url: string;
  alt?: string;
  source?: 'pixabay' | 'wikimedia' | 'upload';
  title?: string;
  creator?: string;
  license?: string;
  /** Small preview URL when source provides one, e.g. Pixabay thumbnails. */
  previewUrl?: string;
  photographer?: string;
  pageUrl?: string;
  /** Preformatted attribution line; stored for post-game display, not shown during play. */
  attributionText?: string;
}

export interface McOption {
  id: string;
  text: string;
  isCorrect: boolean;
  media?: MediaAttachment;
}

export interface OrderingItem {
  id: string;
  text: string;
  media?: MediaAttachment;
}

export interface Question {
  id: string;
  order: number;
  type: QuestionType;
  lines: QuestionLine[];
  hint?: string;
  acceptedAnswers?: string[];
  options?: McOption[];
  orderingItems?: OrderingItem[];
  orderingCorrectOrder?: string[];
  orderingDirectionTop?: string;
  orderingDirectionBottom?: string;
  /** MC/ordering: hide option labels from participants while answering; labels stay in data. */
  imageOnlyOptions?: boolean;
  /** MC: ny tilfeldig rekkefølge for deltakere hver gang spørsmålet åpnes. */
  shuffleMcOptionsOnOpen?: boolean;
  gameType?: GameId;
  game?: GameQuestionConfig;
  media?: MediaAttachment[];
  /**
   * Fra tekstimport (ARP-P / ARP-W): hent relevant bilde ved «Legg til bilder».
   * Fjernes når bilde er lagt inn.
   */
  autoImageProvider?: 'pixabay' | 'wikimedia';
  /** Valgfri dekor-emoji (forstørres i UI). Ignoreres når spørsmålet har bilde. */
  decorEmoji?: string;
  maxPoints: number;
  timer?: QuestionTimerConfig;
}

export type QuestionStatus = 'locked' | 'open';

export interface Team {
  id: string;
  name: string;
  /** Automatisk testdeltaker opprettet av quizmaster i testmodus. */
  isTest?: boolean;
}

export interface TeamPresence {
  teamId: string;
  status: 'connected' | 'disconnected';
  connectedAt?: number;
  disconnectedAt?: number;
  lastSeenAt: number;
  reconnectUntil?: number;
}

export interface Answer {
  teamId: string;
  questionId: string;
  value: string;
  updatedAt: number;
  /** 1-based attempt count for this team/question (MC, ordering, math single). */
  attemptNumber?: number;
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
  source: 'auto' | 'peer' | 'override' | 'game' | 'ai';
  /** Prestasjonspoeng for denne oppgaven (performance mode). */
  performancePoints?: number;
  /** Kort råresultat for visning, f.eks. «182 440 poeng». */
  rawResultSummary?: string;
}

export interface AiGrade {
  teamId: string;
  questionId: string;
  points: number;
  reasoning: string;
  confidence?: 'high' | 'medium' | 'low';
  submittedAt: number;
}

export type AiGradingStatus = 'idle' | 'running' | 'done' | 'error';

export interface AiGradingProgress {
  status: AiGradingStatus;
  completed: number;
  total: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
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

export type OpenAnswerGradingMode = 'peer' | 'ai';

export type QuizScoringMode = 'ranking' | 'performance';

export interface RoomSettings {
  showLeaderboard: boolean;
  teamReviewOpen: boolean;
  answerKeyOpen: boolean;
  allowNewTeams: boolean;
  finalResultLocked: boolean;
  /** Quizmaster kjører prøvegjennomgang med én testdeltaker. */
  testMode: boolean;
  testTeamId?: string;
  /** Deltakere kan ikke svare etter quiz-slutt (schedule end eller QUIZ_END). */
  teamsLockedOut?: boolean;
  /** Hvordan åpne tekstsvar poengsettes etter quiz. */
  openAnswerGradingMode: OpenAnswerGradingMode;
  /** Rangering (5/3/1) eller prestasjonspoeng (10 000 = sterk prestasjon). */
  scoringMode?: QuizScoringMode;
}

export interface FinalLeaderboardSnapshot {
  lockedAt: number;
  entries: LeaderboardEntry[];
}

export interface RoomState {
  id: string;
  joinCode: string;
  phase: RoomPhase;
  teams: Team[];
  teamPresence: Record<string, TeamPresence>;
  questions: Question[];
  questionStatus: Record<string, QuestionStatus>;
  /** True once quizmaster has opened the question at least once (teams may see text after). */
  questionsActivated: Record<string, boolean>;
  answeredByTeam: Record<string, string[]>;
  /** Selvgående: oppgaver (unntatt spill) låst for deltaker etter innsending. */
  teamQuestionLocks?: Record<string, string[]>;
  answers: Answer[];
  gameRounds: GameRound[];
  gameStarts: GameTeamStart[];
  gameSubmissions: GameSubmission[];
  gameResults: GameResult[];
  scores: ScoreEntry[];
  finalLeaderboardSnapshot?: FinalLeaderboardSnapshot;
  gradingAssignments: GradingAssignment[];
  peerGrades: PeerGrade[];
  aiGrades: AiGrade[];
  aiGrading?: AiGradingProgress;
  protests: Protest[];
  settings: RoomSettings;
  schedule?: QuizSchedule;
  liveStartedAt?: number;
  activeQuestionTimers: Record<string, ActiveQuestionTimer>;
  /** MC: deltaker-rekkefølge per spørsmål for gjeldende åpning (kun når shuffleMcOptionsOnOpen). */
  mcDisplayOptionOrder?: Record<string, string[]>;
  /** Server clock hint for client countdown skew correction (updated on state emit). */
  serverNow?: number;
  /** Avslør bildet: per-lag fremdrift (ruter, valg) — synkroniseres fra server. */
  revealImageProgress?: RevealImageTeamProgress[];
}

export interface RevealImageTeamProgress {
  questionId: string;
  teamId: string;
  openedTileIndices: number[];
  usedChoices: boolean;
  wrongChoiceIds: string[];
  /** Opaque fill color per tile index (same order as grid, length gridSize²). */
  tileColors: string[];
  /** @deprecated Legacy random order — ignored when revealing by click. */
  tileOrder?: number[];
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
