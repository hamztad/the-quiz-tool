export type GameId = 'timerChallenge' | 'anagram' | 'mathRace';

export type RankingMode = 'highest' | 'lowest';

export type GameResultKind = 'ranked' | 'directScore';

export type GamePointMode = 'winnerTakesAll' | 'rankedBands' | 'directScoreToPoints';

export interface GamePointBand {
  rank: number;
  points: number;
}

export interface GameQuestionConfigBase {
  gameId: GameId;
  title?: string;
  instructions?: string;
  rankingMode: RankingMode;
  resultKind: GameResultKind;
  pointMode: GamePointMode;
  pointBands?: GamePointBand[];
}

export interface TimerChallengeConfig extends GameQuestionConfigBase {
  gameId: 'timerChallenge';
  targetMs: number;
  rankingMode: 'lowest';
  resultKind: 'ranked';
}

export interface AnagramGameConfig extends GameQuestionConfigBase {
  gameId: 'anagram';
  mode: 'classic' | 'ranking' | 'hintDecay';
  shuffleMode: 'perWord' | 'globalPreserveShape';
  words: string[];
}

export interface MathRaceGameConfig extends GameQuestionConfigBase {
  gameId: 'mathRace';
  problems: string[];
}

export type GameQuestionConfig =
  | TimerChallengeConfig
  | AnagramGameConfig
  | MathRaceGameConfig;

export interface GameRound {
  questionId: string;
  gameId: GameId;
  startedAt: number;
  lockedAt?: number;
  roundNonce?: string;
}

export interface TimerChallengeSubmissionPayload {
  gameId: 'timerChallenge';
  elapsedMs: number;
}

export interface AnagramSubmissionPayload {
  gameId: 'anagram';
  answer: string;
}

export interface MathRaceSubmissionPayload {
  gameId: 'mathRace';
  correctCount: number;
  completedAtMs?: number;
}

export type GameSubmissionPayload =
  | TimerChallengeSubmissionPayload
  | AnagramSubmissionPayload
  | MathRaceSubmissionPayload;

export interface GameSubmission {
  questionId: string;
  teamId: string;
  gameId: GameId;
  payload: GameSubmissionPayload;
  submittedAt: number;
  serverReceivedAt: number;
}

export interface GameResult {
  questionId: string;
  teamId: string;
  gameId: GameId;
  rankValue: number;
  displayValue: string;
  rank: number;
  quizPoints: number;
  status: 'ranked' | 'invalid' | 'missing';
}

export interface GameRankInput {
  teamId: string;
  rankValue: number;
}

export interface GameRankedEntry extends GameRankInput {
  rank: number;
}
