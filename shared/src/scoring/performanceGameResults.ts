import {
  formatDropBallScore,
  formatEmojiHuntMs,
  formatTimerMs,
  isDropBallSubmissionPayload,
  isEmojiHuntSubmissionPayload,
  isMathExpressionSubmissionPayload,
  isRevealImageAnswerCorrect,
  isRevealImageSubmissionPayload,
  isRainbowPuzzleSubmissionPayload,
  isTimerChallengeSubmissionPayload,
} from '../games/index.js';
import type {
  DropBallConfig,
  EmojiHuntConfig,
  GameId,
  GameQuestionConfig,
  GameResult,
  GameSubmission,
  MathExpressionConfig,
  RainbowPuzzleConfig,
  RevealImageConfig,
  TimerChallengeConfig,
} from '../games/types.js';
import {
  formatRegneraceResultLabel,
  isMathAnswerCorrect,
  normalizeMathRaceConfig,
  regneracePerformancePoints,
  regneraceRankValue,
} from '../games/modules/mathExpression.js';
import { convertCurveToPerformancePoints } from './performanceScoring.js';
import { PERFORMANCE_TARGET_POINTS } from './quizScoringMode.js';

const STOP_CLOCK_DECAY_K = -Math.log(0.6) / 500;
const EMOJI_PERFORMANCE_BENCHMARK_MS = 12_000;
const EMOJI_PERFORMANCE_ZERO_MS = 25_000;
const RAINBOW_BENCHMARK = 3_000;
const DROP_BALL_BENCHMARK_BASE = 70_000;
const DROP_BALL_POWER_EXP = 0.88;
function basePerformanceResult(
  questionId: string,
  teamId: string,
  gameId: GameId,
  performancePoints: number,
  rawResultLabel: string,
  displayValue: string,
  rankValue = performancePoints,
): GameResult {
  return {
    questionId,
    teamId,
    gameId,
    rankValue,
    displayValue,
    rank: 0,
    quizPoints: 0,
    performancePoints,
    rawResultLabel,
    status: 'ranked',
  };
}

function stopClockPerformancePoints(diffMs: number): number {
  return convertCurveToPerformancePoints(diffMs, {
    kind: 'inverse_exp',
    perfectRaw: 0,
    decayK: STOP_CLOCK_DECAY_K,
    zeroAbove: 5000,
  });
}

function emojiHuntPerformancePoints(totalMs: number): number {
  if (totalMs <= EMOJI_PERFORMANCE_BENCHMARK_MS) return PERFORMANCE_TARGET_POINTS;
  if (totalMs >= EMOJI_PERFORMANCE_ZERO_MS) return 0;
  const excess = totalMs - EMOJI_PERFORMANCE_BENCHMARK_MS;
  const span = EMOJI_PERFORMANCE_ZERO_MS - EMOJI_PERFORMANCE_BENCHMARK_MS;
  const decayK = 4 / span;
  return Math.round(
    PERFORMANCE_TARGET_POINTS * Math.exp(-decayK * excess),
  );
}

export function buildTimerChallengePerformanceResults(
  questionId: string,
  config: TimerChallengeConfig,
  submissions: GameSubmission[],
): GameResult[] {
  const results: GameResult[] = [];
  for (const submission of submissions) {
    if (!isTimerChallengeSubmissionPayload(submission.payload)) continue;
    const diff = Math.abs(submission.payload.elapsedMs - config.targetMs);
    const performancePoints = stopClockPerformancePoints(diff);
    results.push(
      basePerformanceResult(
        questionId,
        submission.teamId,
        'timerChallenge',
        performancePoints,
        `${formatTimerMs(diff)} fra målet`,
        `${formatTimerMs(diff)} fra målet`,
        diff,
      ),
    );
  }
  return bestPerformancePerTeam(results);
}

export function buildRainbowPuzzlePerformanceResults(
  questionId: string,
  config: RainbowPuzzleConfig,
  submissions: GameSubmission[],
): GameResult[] {
  const results: GameResult[] = [];
  for (const submission of submissions) {
    if (!isRainbowPuzzleSubmissionPayload(submission.payload)) continue;
    const raw = Math.max(0, Math.floor(submission.payload.score));
    const performancePoints = convertCurveToPerformancePoints(raw, {
      kind: 'linear',
      benchmark: RAINBOW_BENCHMARK,
    });
    results.push(
      basePerformanceResult(
        questionId,
        submission.teamId,
        'rainbowPuzzle',
        performancePoints,
        `${raw} poeng`,
        `${raw} poeng`,
        raw,
      ),
    );
  }
  return bestPerformancePerTeam(results);
}

export function buildDropBallPerformanceResults(
  questionId: string,
  config: DropBallConfig,
  submissions: GameSubmission[],
): GameResult[] {
  const benchmark =
    DROP_BALL_BENCHMARK_BASE * (config.totalRounds / 3);
  const results: GameResult[] = [];
  for (const submission of submissions) {
    if (!isDropBallSubmissionPayload(submission.payload)) continue;
    const raw = Math.max(0, Math.round(submission.payload.score));
    const performancePoints = convertCurveToPerformancePoints(raw, {
      kind: 'power',
      benchmark,
      exponent: DROP_BALL_POWER_EXP,
    });
    results.push(
      basePerformanceResult(
        questionId,
        submission.teamId,
        'dropBall',
        performancePoints,
        formatDropBallScore(raw),
        formatDropBallScore(raw),
        raw,
      ),
    );
  }
  return bestPerformancePerTeam(results);
}

export function buildEmojiHuntPerformanceResults(
  questionId: string,
  _config: EmojiHuntConfig,
  submissions: GameSubmission[],
): GameResult[] {
  const results: GameResult[] = [];
  for (const submission of submissions) {
    if (!isEmojiHuntSubmissionPayload(submission.payload)) continue;
    const totalMs = Math.max(0, Math.round(submission.payload.totalMs));
    const performancePoints = emojiHuntPerformancePoints(totalMs);
    results.push(
      basePerformanceResult(
        questionId,
        submission.teamId,
        'emojiHunt',
        performancePoints,
        formatEmojiHuntMs(totalMs),
        formatEmojiHuntMs(totalMs),
        totalMs,
      ),
    );
  }
  return bestPerformancePerTeam(results, 'lowest');
}

export function buildRevealImagePerformanceResults(
  questionId: string,
  config: RevealImageConfig,
  submissions: GameSubmission[],
): GameResult[] {
  const results: GameResult[] = [];
  for (const submission of submissions) {
    if (!isRevealImageSubmissionPayload(submission.payload)) continue;
    const correct = isRevealImageAnswerCorrect(submission.payload.answer, config);
    const totalTiles = Math.max(1, submission.payload.totalTiles);
    const openedTiles = Math.max(0, Math.min(totalTiles, submission.payload.openedTiles));
    const openedRatio = openedTiles / totalTiles;
    const ceiling = submission.payload.source === 'choice' ? config.choiceMultiplier : 1;
    const performancePoints = convertCurveToPerformancePoints(openedRatio, {
      kind: 'reveal_decay',
      openedRatio,
      ceiling,
      exponent: 1.35,
      minScore: 800,
      correct,
    });
    results.push(
      basePerformanceResult(
        questionId,
        submission.teamId,
        'revealImage',
        performancePoints,
        `Du åpnet ${openedTiles} av ${totalTiles} ruter`,
        `${openedTiles}/${totalTiles} ruter`,
        correct ? 1 - openedRatio : 0,
      ),
    );
  }
  return bestPerformancePerTeam(results);
}

export function buildMathExpressionPerformanceResults(
  questionId: string,
  config: MathExpressionConfig,
  submissions: GameSubmission[],
  teamIds: string[],
): GameResult[] {
  const mathSubmissions = submissions.filter(
    (submission): submission is GameSubmission & {
      payload: import('../games/types.js').MathExpressionSubmissionPayload;
    } => isMathExpressionSubmissionPayload(submission.payload),
  );

  if (config.mode === 'single') {
    const attemptsByTeam = new Map<string, number>();
    const latestByTeam = new Map<string, { answer: string; attempt: number }>();
    for (const submission of mathSubmissions) {
      if (submission.payload.mode !== 'single') continue;
      const attempt = (attemptsByTeam.get(submission.teamId) ?? 0) + 1;
      attemptsByTeam.set(submission.teamId, attempt);
      latestByTeam.set(submission.teamId, {
        answer: submission.payload.answer,
        attempt,
      });
    }

    return Array.from(new Set([...teamIds, ...latestByTeam.keys()])).map((teamId) => {
      const latest = latestByTeam.get(teamId);
      if (!latest) {
        return {
          questionId,
          teamId,
          gameId: 'mathExpression' as const,
          rankValue: 0,
          displayValue: 'Ikke besvart',
          rank: 0,
          quizPoints: 0,
          performancePoints: 0,
          rawResultLabel: 'Ikke besvart',
          status: 'ranked' as const,
        };
      }
      const correct = isMathAnswerCorrect(latest.answer, config.expression, {
        rounding: config.rounding,
        decimals: config.decimals,
      });
      const performancePoints = correct
        ? convertCurveToPerformancePoints(latest.attempt, {
            kind: 'attempt_decay',
            decay: 0.75,
            floor: 2500,
          })
        : 0;
      return {
        questionId,
        teamId,
        gameId: 'mathExpression' as const,
        rankValue: correct ? 1 : 0,
        displayValue: correct ? 'Riktig svar' : 'Feil svar',
        rank: 0,
        quizPoints: 0,
        performancePoints,
        rawResultLabel: correct
          ? `Riktig på forsøk ${latest.attempt}`
          : 'Feil svar',
        status: 'ranked' as const,
      };
    });
  }

  const raceConfig = normalizeMathRaceConfig(config);
  const results: GameResult[] = [];
  for (const submission of mathSubmissions) {
    if (submission.payload.mode !== 'race') continue;
    const payload = submission.payload;
    const performancePoints = regneracePerformancePoints(
      payload.solvedCount,
      payload.problemCount,
      payload.timeUsedMs,
      payload.timeLimitMs,
    );
    const label = formatRegneraceResultLabel(
      payload.solvedCount,
      payload.problemCount,
      payload.timeUsedMs,
    );
    results.push(
      basePerformanceResult(
        questionId,
        submission.teamId,
        'mathExpression',
        performancePoints,
        label,
        label,
        regneraceRankValue(payload.solvedCount, payload.timeUsedMs),
      ),
    );
  }
  return bestPerformancePerTeam(results, 'highest');
}

export function buildAnagramPerformanceResults(
  questionId: string,
  teamIds: string[],
): GameResult[] {
  return teamIds.map((teamId) => ({
    questionId,
    teamId,
    gameId: 'anagram' as const,
    rankValue: 0,
    displayValue: 'Støttes ikke lenger',
    rank: 0,
    quizPoints: 0,
    performancePoints: 0,
    rawResultLabel: 'Støttes ikke lenger',
    status: 'invalid' as const,
  }));
}

function bestPerformancePerTeam(
  results: GameResult[],
  mode: 'highest' | 'lowest' = 'highest',
): GameResult[] {
  const best = new Map<string, GameResult>();
  for (const result of results) {
    const current = best.get(result.teamId);
    const points = result.performancePoints ?? 0;
    const currentPoints = current?.performancePoints ?? 0;
    const better =
      !current ||
      (mode === 'highest' ? points > currentPoints : points < currentPoints);
    if (better) best.set(result.teamId, result);
  }
  return Array.from(best.values());
}

export function buildGamePerformanceResults(
  questionId: string,
  game: GameQuestionConfig,
  submissions: GameSubmission[],
  teamIds: string[],
): GameResult[] {
  switch (game.gameId) {
    case 'timerChallenge':
      return buildTimerChallengePerformanceResults(questionId, game, submissions);
    case 'rainbowPuzzle':
      return buildRainbowPuzzlePerformanceResults(questionId, game, submissions);
    case 'dropBall':
      return buildDropBallPerformanceResults(questionId, game, submissions);
    case 'emojiHunt':
      return buildEmojiHuntPerformanceResults(questionId, game, submissions);
    case 'revealImage':
      return buildRevealImagePerformanceResults(questionId, game, submissions);
    case 'mathExpression':
      return buildMathExpressionPerformanceResults(questionId, game, submissions, teamIds);
    case 'anagram':
      return buildAnagramPerformanceResults(questionId, teamIds);
    default:
      return [];
  }
}
