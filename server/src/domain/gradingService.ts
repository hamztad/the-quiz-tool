import type { GradingAssignment, Question, RoomState, ScoreEntry } from '@quiz-tool/shared';
import { generateId } from '../utils/id.js';

export function getOpenQuestionIds(questions: Question[]): string[] {
  return questions.filter((q) => q.type === 'open').map((q) => q.id);
}

/** Random derangement: each team grades exactly one other team */
export function buildGradingAssignments(teamIds: string[], openQuestionIds: string[]): GradingAssignment[] {
  if (teamIds.length < 2 || openQuestionIds.length === 0) {
    return [];
  }

  const shuffled = [...teamIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const assignments: GradingAssignment[] = [];

  for (let i = 0; i < teamIds.length; i++) {
    const graderTeamId = teamIds[i];
    let targetTeamId = shuffled[i];
    if (targetTeamId === graderTeamId) {
      targetTeamId = shuffled[(i + 1) % shuffled.length];
    }
    if (targetTeamId === graderTeamId) {
      const others = teamIds.filter((id) => id !== graderTeamId);
      targetTeamId = others[0];
    }

    assignments.push({
      graderTeamId,
      targetTeamId,
      questionIds: [...openQuestionIds],
    });
  }

  return assignments;
}

export function mergePeerGradesToScores(room: RoomState): ScoreEntry[] {
  const nonPeer = room.scores.filter((s) => s.source !== 'peer');
  const peerScores: ScoreEntry[] = room.peerGrades.map((pg) => ({
    teamId: pg.targetTeamId,
    questionId: pg.questionId,
    points: pg.points,
    source: 'peer' as const,
  }));
  return [...nonPeer, ...peerScores];
}

export function scoreMcAnswer(
  teamId: string,
  questionId: string,
  value: string,
  question: Question,
): ScoreEntry | null {
  if (question.type !== 'mc' || !question.options) return null;
  const selected = question.options.find((o) => o.id === value);
  const points = selected?.isCorrect ? question.maxPoints : 0;
  return { teamId, questionId, points, source: 'auto' };
}

export function upsertScore(scores: ScoreEntry[], entry: ScoreEntry): ScoreEntry[] {
  const filtered = scores.filter(
    (s) => !(s.teamId === entry.teamId && s.questionId === entry.questionId),
  );
  return [...filtered, entry];
}

export function createProtest(
  teamId: string,
  questionId: string,
  message?: string,
) {
  return {
    id: generateId('protest'),
    teamId,
    questionId,
    message,
    status: 'pending' as const,
  };
}
