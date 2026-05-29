import type { PublicRoomState, ScoreEntry } from '@quiz-tool/shared';
import { resolveScoringMode, scoreEntryTotal } from '@quiz-tool/shared';

export interface TeamQuestionScore {
  points: number | null;
  performancePoints: number | null;
  rawResultSummary: string | null;
  source: ScoreEntry['source'] | null;
  graderTeamId?: string;
}

export function getTeamQuestionScore(
  room: PublicRoomState,
  teamId: string,
  questionId: string,
): TeamQuestionScore {
  const scoringMode = resolveScoringMode(room.settings);
  const empty: TeamQuestionScore = {
    points: null,
    performancePoints: null,
    rawResultSummary: null,
    source: null,
  };

  const scoreEntry = room.scores.find(
    (s) => s.teamId === teamId && s.questionId === questionId,
  );

  if (scoreEntry?.source === 'override') {
    return {
      points: scoringMode === 'ranking' ? scoreEntry.points : null,
      performancePoints:
        scoringMode === 'performance' ? (scoreEntry.performancePoints ?? 0) : null,
      rawResultSummary: scoreEntry.rawResultSummary ?? null,
      source: 'override',
    };
  }

  if (scoreEntry?.source === 'ai') {
    return {
      points: scoringMode === 'ranking' ? scoreEntry.points : null,
      performancePoints:
        scoringMode === 'performance' ? (scoreEntry.performancePoints ?? 0) : null,
      rawResultSummary: scoreEntry.rawResultSummary ?? null,
      source: 'ai',
    };
  }

  const aiGrade = room.aiGrades.find(
    (g) => g.teamId === teamId && g.questionId === questionId,
  );
  if (aiGrade && scoringMode === 'ranking') {
    return { points: aiGrade.points, performancePoints: null, rawResultSummary: null, source: 'ai' };
  }

  if (scoreEntry?.source === 'auto') {
    return {
      points: scoringMode === 'ranking' ? scoreEntry.points : null,
      performancePoints:
        scoringMode === 'performance' ? (scoreEntry.performancePoints ?? 0) : null,
      rawResultSummary: scoreEntry.rawResultSummary ?? null,
      source: 'auto',
    };
  }

  const peerGrade = room.peerGrades.find(
    (pg) => pg.targetTeamId === teamId && pg.questionId === questionId,
  );
  if (peerGrade) {
    return {
      points: scoringMode === 'ranking' ? peerGrade.points : null,
      performancePoints: null,
      rawResultSummary: null,
      source: 'peer',
      graderTeamId: peerGrade.graderTeamId,
    };
  }

  if (scoreEntry?.source === 'peer') {
    return {
      points: scoringMode === 'ranking' ? scoreEntry.points : null,
      performancePoints:
        scoringMode === 'performance' ? (scoreEntry.performancePoints ?? 0) : null,
      rawResultSummary: scoreEntry.rawResultSummary ?? null,
      source: 'peer',
    };
  }

  if (scoreEntry) {
    return {
      points: scoringMode === 'ranking' ? scoreEntry.points : null,
      performancePoints:
        scoringMode === 'performance' ? (scoreEntry.performancePoints ?? 0) : null,
      rawResultSummary: scoreEntry.rawResultSummary ?? null,
      source: scoreEntry.source,
    };
  }

  return empty;
}

export function getTeamQuestionPerformancePoints(
  room: PublicRoomState,
  teamId: string,
  questionId: string,
): number | null {
  const { performancePoints } = getTeamQuestionScore(room, teamId, questionId);
  return performancePoints;
}

export function computeTeamTotalPoints(room: PublicRoomState, teamId: string): number {
  const scoringMode = resolveScoringMode(room.settings);
  return room.scores
    .filter((s) => s.teamId === teamId)
    .reduce((sum, entry) => sum + scoreEntryTotal(entry, scoringMode), 0);
}

export function scoreSourceLabel(source: TeamQuestionScore['source']): string {
  switch (source) {
    case 'auto':
      return 'Auto (flervalg)';
    case 'peer':
      return 'Retterunde';
    case 'ai':
      return 'KI-retting';
    case 'override':
      return 'Overstyrt';
    case 'game':
      return 'Spill';
    default:
      return 'Ikke satt';
  }
}

export function leaderboardPointsLabel(room: PublicRoomState): string {
  return resolveScoringMode(room.settings) === 'performance'
    ? 'Prestasjonspoeng totalt'
    : 'Quizpoeng';
}
