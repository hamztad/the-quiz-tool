import type { Question, QuizScoringMode, ScoreEntry } from '../types/room.js';
import { parseOrderingAnswer, scoreOrderingAnswer } from '../ordering/orderingQuestion.js';
import { convertCurveToPerformancePoints, mapGraderPointsToPerformance } from './performanceScoring.js';
import { PERFORMANCE_TARGET_POINTS } from './quizScoringMode.js';

const MC_ORDERING_ATTEMPT_CURVE = {
  kind: 'attempt_decay' as const,
  decay: 0.75,
  floor: 2500,
};

export function performancePointsForCorrectAttempt(attemptNumber: number): number {
  return convertCurveToPerformancePoints(
    Math.max(1, Math.round(attemptNumber)),
    MC_ORDERING_ATTEMPT_CURVE,
  );
}

export function buildPerformanceAutoScoreEntry(params: {
  teamId: string;
  questionId: string;
  question: Question;
  value: string;
  attemptNumber: number;
}): ScoreEntry | null {
  const { teamId, questionId, question, value, attemptNumber } = params;

  if (question.type === 'mc') {
    if (!question.options) return null;
    const selected = question.options.find((o) => o.id === value);
    if (!selected?.isCorrect) return null;
    const performancePoints = performancePointsForCorrectAttempt(attemptNumber);
    return {
      teamId,
      questionId,
      points: 0,
      performancePoints,
      rawResultSummary: `Riktig på forsøk ${attemptNumber}`,
      source: 'auto',
    };
  }

  if (question.type === 'ordering') {
    const submittedOrder = parseOrderingAnswer(value);
    if (!submittedOrder) return null;
    const rankingEntry = scoreOrderingAnswer(teamId, questionId, value, question);
    if (!rankingEntry || rankingEntry.points === 0) return null;
    const performancePoints = performancePointsForCorrectAttempt(attemptNumber);
    return {
      teamId,
      questionId,
      points: 0,
      performancePoints,
      rawResultSummary: `Riktig på forsøk ${attemptNumber}`,
      source: 'auto',
    };
  }

  return null;
}

export function buildGraderScoreEntry(params: {
  teamId: string;
  questionId: string;
  graderPoints: number;
  maxPoints: number;
  source: 'peer' | 'ai';
  scoringMode: QuizScoringMode;
}): ScoreEntry {
  const { teamId, questionId, graderPoints, maxPoints, source, scoringMode } = params;
  if (scoringMode === 'performance') {
    return {
      teamId,
      questionId,
      points: 0,
      performancePoints: mapGraderPointsToPerformance(graderPoints, maxPoints),
      rawResultSummary: `${graderPoints}/${maxPoints} poeng`,
      source,
    };
  }
  return { teamId, questionId, points: graderPoints, source };
}

export function buildOverrideScoreEntry(params: {
  teamId: string;
  questionId: string;
  points: number;
  maxPoints: number;
  scoringMode: QuizScoringMode;
}): ScoreEntry {
  const { teamId, questionId, points, maxPoints, scoringMode } = params;
  if (scoringMode === 'performance') {
    return {
      teamId,
      questionId,
      points: 0,
      performancePoints: mapGraderPointsToPerformance(points, maxPoints),
      source: 'override',
    };
  }
  return { teamId, questionId, points, source: 'override' };
}

export function buildProtestAwardScoreEntry(params: {
  teamId: string;
  questionId: string;
  awardedPoints: number;
  maxPoints: number;
  scoringMode: QuizScoringMode;
}): ScoreEntry {
  return buildOverrideScoreEntry({
    teamId: params.teamId,
    questionId: params.questionId,
    points: params.awardedPoints,
    maxPoints: params.maxPoints,
    scoringMode: params.scoringMode,
  });
}

export function formatPerformanceAttemptSummary(attemptNumber: number): string {
  return `Riktig på forsøk ${attemptNumber} · ${PERFORMANCE_TARGET_POINTS.toLocaleString('nb-NO')} ved første forsøk`;
}
