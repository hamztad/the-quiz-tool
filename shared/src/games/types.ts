export type GameId =
  | 'timerChallenge'
  | 'rainbowPuzzle'
  | 'emojiHunt'
  | 'anagram'
  | 'mathExpression'
  | 'mathRace'
  | 'dropBall'
  | 'revealImage';

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
  mode: 'classic';
  shuffleMode: 'perWord';
  answerText: string;
  scrambledText: string;
  rankingMode: 'highest';
  resultKind: 'directScore';
  pointMode: 'directScoreToPoints';
}

export interface MathRaceGameConfig extends GameQuestionConfigBase {
  gameId: 'mathRace';
  problems: string[];
}

export type MathExpressionMode = 'single' | 'race';
export type MathExpressionAnswerMode = 'input' | 'multipleChoice';
export type MathExpressionRoundingMode = 'exact' | 'rounded';

export interface MathExpressionBaseConfig extends GameQuestionConfigBase {
  gameId: 'mathExpression';
  mode: MathExpressionMode;
}

export interface MathExpressionSingleConfig extends MathExpressionBaseConfig {
  mode: 'single';
  expression: string;
  rounding: MathExpressionRoundingMode;
  decimals: 0 | 1 | 2;
  rankingMode: 'highest';
  resultKind: 'directScore';
  pointMode: 'directScoreToPoints';
}

export interface MathExpressionRaceConfig extends MathExpressionBaseConfig {
  mode: 'race';
  expressions: string[];
  answerMode: MathExpressionAnswerMode;
  wrongPenaltyMs: number;
  rankingMode: 'lowest';
  resultKind: 'ranked';
  pointMode: 'rankedBands';
}

export type MathExpressionConfig =
  | MathExpressionSingleConfig
  | MathExpressionRaceConfig;

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

export type DropBallTotalRounds = 1 | 2 | 3;

export interface DropBallConfig extends GameQuestionConfigBase {
  gameId: 'dropBall';
  totalRounds: DropBallTotalRounds;
  obstacleCount: number;
  coinValues: number[];
  maxAirTimeMs: number;
  allCoinsBonus: number;
  allObstaclesBonus: number;
  perfectBoardBonus: number;
  rankingMode: 'highest';
  resultKind: 'ranked';
  pointMode: 'rankedBands';
}

export type RevealImageGridSize = 4 | 5 | 6;

export interface RevealImageChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface RevealImageConfig extends GameQuestionConfigBase {
  gameId: 'revealImage';
  gridSize: RevealImageGridSize;
  correctAnswer: string;
  acceptedAnswers: string[];
  choices?: RevealImageChoiceOption[];
  choiceMultiplier: number;
  minCorrectScore: number;
  rankingMode: 'highest';
  resultKind: 'directScore';
  pointMode: 'directScoreToPoints';
}

export type GameQuestionConfig =
  | TimerChallengeConfig
  | RainbowPuzzleConfig
  | EmojiHuntConfig
  | AnagramGameConfig
  | MathExpressionConfig
  | MathRaceGameConfig
  | DropBallConfig
  | RevealImageConfig;

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

export interface MathExpressionSingleSubmissionPayload {
  gameId: 'mathExpression';
  mode: 'single';
  answer: string;
}

export interface MathExpressionRaceSubmissionPayload {
  gameId: 'mathExpression';
  mode: 'race';
  totalMs: number;
  penalties: number;
}

export type MathExpressionSubmissionPayload =
  | MathExpressionSingleSubmissionPayload
  | MathExpressionRaceSubmissionPayload;

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

export interface DropBallRoundResult {
  roundIndex: number;
  airTimeMs: number;
  obstacleHits: number;
  coinValues: number[];
  obstaclePoints: number;
  coinPoints: number;
  allCoinsBonus: number;
  allObstaclesBonus: number;
  perfectBoardBonus: number;
  score: number;
}

export interface DropBallSubmissionPayload {
  gameId: 'dropBall';
  score: number;
  rounds?: DropBallRoundResult[];
}

export interface RevealImageSubmissionPayload {
  gameId: 'revealImage';
  answer: string;
  openedTiles: number;
  totalTiles: number;
  usedChoices: boolean;
  source: 'text' | 'choice';
}

/** Client → server answer submit (tile/score state comes from server progress). */
export interface RevealImageClientAnswerPayload {
  gameId: 'revealImage';
  answer: string;
  source: 'text' | 'choice';
  choiceId?: string;
}

export type GameSubmissionPayload =
  | TimerChallengeSubmissionPayload
  | RainbowPuzzleSubmissionPayload
  | EmojiHuntSubmissionPayload
  | AnagramSubmissionPayload
  | MathExpressionSubmissionPayload
  | MathRaceSubmissionPayload
  | DropBallSubmissionPayload
  | RevealImageClientAnswerPayload;

export type StoredGameSubmissionPayload =
  | TimerChallengeSubmissionPayload
  | RainbowPuzzleSubmissionPayload
  | EmojiHuntSubmissionPayload
  | AnagramSubmissionPayload
  | MathExpressionSubmissionPayload
  | MathRaceSubmissionPayload
  | DropBallSubmissionPayload
  | RevealImageSubmissionPayload;

export interface GameSubmission {
  questionId: string;
  teamId: string;
  gameId: GameId;
  payload: StoredGameSubmissionPayload;
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
