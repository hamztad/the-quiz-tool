import type { PublicRoomState, ScoreEntry } from '@quiz-tool/shared';

export interface TeamQuestionScore {
  points: number | null;
  source: ScoreEntry['source'] | null;
  graderTeamId?: string;
}

export function getTeamQuestionScore(
  room: PublicRoomState,
  teamId: string,
  questionId: string,
): TeamQuestionScore {
  const scoreEntry = room.scores.find(
    (s) => s.teamId === teamId && s.questionId === questionId,
  );

  if (scoreEntry?.source === 'override') {
    return { points: scoreEntry.points, source: 'override' };
  }

  if (scoreEntry?.source === 'auto') {
    return { points: scoreEntry.points, source: 'auto' };
  }

  const peerGrade = room.peerGrades.find(
    (pg) => pg.targetTeamId === teamId && pg.questionId === questionId,
  );
  if (peerGrade) {
    return {
      points: peerGrade.points,
      source: 'peer',
      graderTeamId: peerGrade.graderTeamId,
    };
  }

  if (scoreEntry?.source === 'peer') {
    return { points: scoreEntry.points, source: 'peer' };
  }

  if (scoreEntry) {
    return { points: scoreEntry.points, source: scoreEntry.source };
  }

  return { points: null, source: null };
}

export function computeTeamTotalPoints(room: PublicRoomState, teamId: string): number {
  return room.questions.reduce((sum, q) => {
    const { points } = getTeamQuestionScore(room, teamId, q.id);
    return sum + (points ?? 0);
  }, 0);
}

export function scoreSourceLabel(source: TeamQuestionScore['source']): string {
  switch (source) {
    case 'auto':
      return 'Auto (flervalg)';
    case 'peer':
      return 'Retterunde';
    case 'override':
      return 'Overstyrt';
    default:
      return 'Ikke satt';
  }
}
