import type { Answer, PeerGrade, ScoreEntry } from '../types/room.js';

export function ownAnswerQuestionIds(answers: Pick<Answer, 'teamId' | 'questionId'>[], teamId: string): string[] {
  return answers.filter((a) => a.teamId === teamId).map((a) => a.questionId);
}

export function ownAwardedPeerGrades(
  peerGrades: Pick<PeerGrade, 'targetTeamId' | 'graderTeamId' | 'questionId' | 'points'>[],
  teamId: string,
): Array<Pick<PeerGrade, 'targetTeamId' | 'graderTeamId' | 'questionId' | 'points'>> {
  return peerGrades.filter((pg) => pg.targetTeamId === teamId);
}

export function ownScoreEntries(
  scores: Pick<ScoreEntry, 'teamId' | 'questionId' | 'points' | 'source'>[],
  teamId: string,
): Array<Pick<ScoreEntry, 'teamId' | 'questionId' | 'points' | 'source'>> {
  return scores.filter((score) => score.teamId === teamId);
}
