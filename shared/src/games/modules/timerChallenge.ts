import type {
  GameResult,
  GameSubmission,
  TimerChallengeConfig,
  TimerChallengeSubmissionPayload,
} from '../types.js';
import { rankGameEntries } from '../ranking.js';
import { quizPointsForRank } from '../scoring.js';

export const DEFAULT_TIMER_TARGET_MS = 10_000;

export function createDefaultTimerChallengeConfig(): TimerChallengeConfig {
  return {
    gameId: 'timerChallenge',
    title: 'Stoppklokka',
    instructions: 'Stopp klokka så nær måltiden som mulig.',
    targetMs: DEFAULT_TIMER_TARGET_MS,
    rankingMode: 'lowest',
    resultKind: 'ranked',
    pointMode: 'winnerTakesAll',
  };
}

export function isTimerChallengeSubmissionPayload(
  payload: unknown,
): payload is TimerChallengeSubmissionPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return record.gameId === 'timerChallenge' && typeof record.elapsedMs === 'number';
}

export function formatTimerMs(ms: number): string {
  return `${(ms / 1000).toFixed(2)} sek`;
}

export function buildTimerChallengeResults(
  questionId: string,
  maxPoints: number,
  config: TimerChallengeConfig,
  submissions: GameSubmission[],
): GameResult[] {
  const timerSubmissions = submissions.filter((submission) =>
    isTimerChallengeSubmissionPayload(submission.payload),
  );
  const bestByTeam = new Map<string, { teamId: string; rankValue: number }>();

  for (const submission of timerSubmissions) {
    const payload = submission.payload as TimerChallengeSubmissionPayload;
    const rankValue = Math.abs(payload.elapsedMs - config.targetMs);
    const current = bestByTeam.get(submission.teamId);
    if (!current || rankValue < current.rankValue) {
      bestByTeam.set(submission.teamId, { teamId: submission.teamId, rankValue });
    }
  }

  const ranked = rankGameEntries(
    Array.from(bestByTeam.values()),
    config.rankingMode,
  );

  return ranked.map((entry) => ({
    questionId,
    teamId: entry.teamId,
    gameId: 'timerChallenge',
    rankValue: entry.rankValue,
    displayValue: `${formatTimerMs(entry.rankValue)} fra målet`,
    rank: entry.rank,
    quizPoints: quizPointsForRank(
      entry.rank,
      maxPoints,
      config.pointMode,
      config.pointBands,
    ),
    status: 'ranked',
  }));
}
