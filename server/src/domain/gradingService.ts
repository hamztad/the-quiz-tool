import type { Protest, Question, RoomState, ScoreEntry } from '@quiz-tool/shared';
import { scoreOrderingAnswer } from '@quiz-tool/shared';
import { generateId } from '../utils/id.js';

export {
  buildGradingAssignments,
  getOpenQuestionIds,
} from '@quiz-tool/shared';

export function mergePeerGradesToScores(room: RoomState): ScoreEntry[] {
  const nonPeer = room.scores.filter((s) => s.source !== 'peer');
  const peerScores: ScoreEntry[] = room.peerGrades.map((pg) => ({
    teamId: pg.targetTeamId,
    questionId: pg.questionId,
    points: pg.points,
    source: 'peer' as const,
  }));
  const keepAi = room.scores.filter((s) => s.source === 'ai');
  return [...nonPeer, ...keepAi, ...peerScores];
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

export function scoreAutoAnswer(
  teamId: string,
  questionId: string,
  value: string,
  question: Question,
): ScoreEntry | null {
  if (question.type === 'mc') {
    return scoreMcAnswer(teamId, questionId, value, question);
  }
  if (question.type === 'ordering') {
    return scoreOrderingAnswer(teamId, questionId, value, question);
  }
  return null;
}

export function upsertScore(scores: ScoreEntry[], entry: ScoreEntry): ScoreEntry[] {
  const filtered = scores.filter(
    (s) => !(s.teamId === entry.teamId && s.questionId === entry.questionId),
  );
  return [...filtered, entry];
}

export function createProtest(
  roomId: string,
  teamId: string,
  questionId: string,
  options: {
    message?: string;
    awardedPoints?: number;
    submittedAnswer?: string;
  } = {},
): Protest {
  return {
    id: generateId('protest'),
    roomId,
    teamId,
    questionId,
    message: options.message,
    awardedPoints: options.awardedPoints,
    submittedAnswer: options.submittedAnswer,
    createdAt: Date.now(),
    status: 'pending' as const,
  };
}
