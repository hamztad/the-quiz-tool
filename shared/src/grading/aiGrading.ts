import type { AiGrade, Answer, Question, RoomState, ScoreEntry } from '../types/room.js';
import { getOpenQuestionIds } from './buildGradingAssignments.js';

export type { OpenAnswerGradingMode } from '../types/room.js';

export interface OpenAnswerGradeJob {
  teamId: string;
  questionId: string;
  answer: string;
  question: Question;
}

export function collectOpenAnswerGradeJobs(
  questions: Question[],
  answers: Answer[],
): OpenAnswerGradeJob[] {
  const openIds = new Set(getOpenQuestionIds(questions));
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const jobs: OpenAnswerGradeJob[] = [];

  for (const answer of answers) {
    if (!openIds.has(answer.questionId)) continue;
    const question = questionById.get(answer.questionId);
    if (!question || question.type !== 'open') continue;
    const value = answer.value.trim();
    if (!value) continue;
    jobs.push({
      teamId: answer.teamId,
      questionId: answer.questionId,
      answer: value,
      question,
    });
  }

  return jobs;
}

export function upsertAiGrade(room: RoomState, grade: AiGrade): RoomState {
  const filtered = room.aiGrades.filter(
    (g) => !(g.teamId === grade.teamId && g.questionId === grade.questionId),
  );
  return { ...room, aiGrades: [...filtered, grade] };
}

export function mergeAiGradesToScores(room: RoomState): ScoreEntry[] {
  const nonAi = room.scores.filter((s) => s.source !== 'ai');
  const aiScores: ScoreEntry[] = room.aiGrades.map((g) => ({
    teamId: g.teamId,
    questionId: g.questionId,
    points: g.points,
    source: 'ai' as const,
  }));
  return [...nonAi, ...aiScores];
}

export function mergePeerAndAiGradesToScores(room: RoomState): ScoreEntry[] {
  const base = room.scores.filter((s) => s.source !== 'peer' && s.source !== 'ai');
  const peerScores: ScoreEntry[] = room.peerGrades.map((pg) => ({
    teamId: pg.targetTeamId,
    questionId: pg.questionId,
    points: pg.points,
    source: 'peer' as const,
  }));
  const aiScores: ScoreEntry[] = room.aiGrades.map((g) => ({
    teamId: g.teamId,
    questionId: g.questionId,
    points: g.points,
    source: 'ai' as const,
  }));
  return [...base, ...peerScores, ...aiScores];
}

export type CanStartAiGradingResult = { ok: true } | { ok: false; message: string };

export function canStartAiGrading(
  openQuestionCount: number,
  jobCount: number,
  aiGradingStatus?: RoomState['aiGrading'],
): CanStartAiGradingResult {
  if (aiGradingStatus?.status === 'running') {
    return { ok: false, message: 'KI-retting pågår allerede.' };
  }
  if (openQuestionCount === 0) {
    return { ok: false, message: 'KI-retting krever minst ett åpent spørsmål i quizen.' };
  }
  if (jobCount === 0) {
    return {
      ok: false,
      message: 'Ingen innsendte åpne svar å rette ennå.',
    };
  }
  return { ok: true };
}

export function questionPromptText(question: Question): string {
  const title = question.lines.find((l) => l.style === 'title')?.text?.trim();
  const body = question.lines.find((l) => l.style === 'body')?.text?.trim();
  return [title, body].filter(Boolean).join('\n') || 'Uten tittel';
}
