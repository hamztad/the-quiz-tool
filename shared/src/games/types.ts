export type GameId = 'timerChallenge' | 'rainbowPuzzle' | 'emojiHunt' | 'anagram' | 'mathRace';

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

export interface RainbowPuzzleConfig extends GameQuestionConfigBase {
  gameId: 'rainbowPuzzle';
  gridSize: 5;
  colors: RainbowPuzzleColor[];
  rankingMode: 'highest';
  resultKind: 'ranked';
}

export interface EmojiHuntConfig extends GameQuestionConfigBase {
  gameId: 'emojiHunt';
  targetCount: 2 | 3 | 4 | 5;
  maxMsPerTarget: number;
  optionCount: 20;
  rankingMode: 'lowest';
  resultKind: 'ranked';
}

export type GameQuestionConfig =
  | TimerChallengeConfig
  | RainbowPuzzleConfig
  | EmojiHuntConfig
  | AnagramGameConfig
  | MathRaceGameConfig;

export interface GameRound {
  questionId: string;
  gameId: GameId;
  startedAt: number;
  lockedAt?: number;
  roundNonce?: string;
}

export interface GameTeamStart {
  questionId: string;
  teamId: string;
  gameId: GameId;
  startedAt: number;
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

export type RainbowPuzzleColor =
  | 'red'
  | 'blue'
  | 'yellow'
  | 'orange'
  | 'pink'
  | 'green'
  | 'black'
  | 'white';

export interface RainbowPuzzleSubmissionPayload {
  gameId: 'rainbowPuzzle';
  score: number;
}

export interface EmojiHuntSubmissionPayload {
  gameId: 'emojiHunt';
  totalMs: number;
}

export type GameSubmissionPayload =
  | TimerChallengeSubmissionPayload
  | RainbowPuzzleSubmissionPayload
  | EmojiHuntSubmissionPayload
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
