import type { AiGrade, Answer, Question, RoomState, ScoreEntry } from '../types/room.js';
import { buildGraderScoreEntry } from '../scoring/performanceQuestionScoring.js';
import { resolveScoringMode } from '../scoring/quizScoringMode.js';
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

function buildAiScoreEntries(room: RoomState): ScoreEntry[] {
  const scoringMode = resolveScoringMode(room.settings);
  const questionById = new Map(room.questions.map((q) => [q.id, q]));
  return room.aiGrades.map((g) => {
    const question = questionById.get(g.questionId);
    const maxPoints = question?.maxPoints ?? 10;
    return buildGraderScoreEntry({
      teamId: g.teamId,
      questionId: g.questionId,
      graderPoints: g.points,
      maxPoints,
      source: 'ai',
      scoringMode,
    });
  });
}

function buildPeerScoreEntries(room: RoomState): ScoreEntry[] {
  const scoringMode = resolveScoringMode(room.settings);
  const questionById = new Map(room.questions.map((q) => [q.id, q]));
  return room.peerGrades.map((pg) => {
    const question = questionById.get(pg.questionId);
    const maxPoints = question?.maxPoints ?? 10;
    return buildGraderScoreEntry({
      teamId: pg.targetTeamId,
      questionId: pg.questionId,
      graderPoints: pg.points,
      maxPoints,
      source: 'peer',
      scoringMode,
    });
  });
}

export function mergeAiGradesToScores(room: RoomState): ScoreEntry[] {
  const nonAi = room.scores.filter((s) => s.source !== 'ai');
  return [...nonAi, ...buildAiScoreEntries(room)];
}

export function mergePeerAndAiGradesToScores(room: RoomState): ScoreEntry[] {
  const base = room.scores.filter((s) => s.source !== 'peer' && s.source !== 'ai');
  return [...base, ...buildPeerScoreEntries(room), ...buildAiScoreEntries(room)];
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
