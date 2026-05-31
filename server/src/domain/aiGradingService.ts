import {
  canStartAiGrading,
  collectOpenAnswerGradeJobs,
  mergeAiGradesToScores,
  type AiGrade,
} from '@quiz-tool/shared';
import type { RoomRecord } from '../store/roomStoreTypes.js';
import { gradeOpenAnswerWithOpenAI } from '../services/openaiAnswerGrade.js';

export function setOpenAnswerGradingMode(
  room: RoomRecord,
  mode: 'peer' | 'ai',
): RoomRecord {
  if (room.phase === 'grading') {
    throw new Error('Kan ikke bytte rettingsmodus under retterunde.');
  }
  if (room.aiGrading?.status === 'running') {
    throw new Error('Kan ikke bytte modus mens KI-retting pågår.');
  }
  return {
    ...room,
    settings: { ...room.settings, openAnswerGradingMode: mode },
  };
}

export function prepareAiGradingRun(room: RoomRecord): {
  room: RoomRecord;
  jobs: ReturnType<typeof collectOpenAnswerGradeJobs>;
} {
  const jobs = collectOpenAnswerGradeJobs(room.questions, room.answers);
  const check = canStartAiGrading(
    room.questions.filter((q) => q.type === 'open').length,
    jobs.length,
    room.aiGrading,
  );
  if (!check.ok) {
    throw new Error(check.message);
  }

  const next: RoomRecord = {
    ...room,
    aiGrades: [],
    peerGrades: room.settings.openAnswerGradingMode === 'ai' ? [] : room.peerGrades,
    gradingAssignments: [],
    aiGrading: {
      status: 'running',
      completed: 0,
      total: jobs.length,
      startedAt: Date.now(),
    },
    settings: { ...room.settings, teamReviewOpen: false },
  };

  return { room: next, jobs };
}

export function applyAiGradeResult(
  room: RoomRecord,
  grade: AiGrade,
  completed: number,
): RoomRecord {
  const filtered = room.aiGrades.filter(
    (g) => !(g.teamId === grade.teamId && g.questionId === grade.questionId),
  );
  const withGrade: RoomRecord = {
    ...room,
    aiGrades: [...filtered, grade],
  };
  return {
    ...withGrade,
    aiGrading: {
      ...withGrade.aiGrading!,
      completed,
    },
  };
}

export function finishAiGradingRun(room: RoomRecord, error?: string): RoomRecord {
  const now = Date.now();
  if (error) {
    return {
      ...room,
      aiGrading: {
        status: 'error',
        completed: room.aiGrading?.completed ?? 0,
        total: room.aiGrading?.total ?? 0,
        startedAt: room.aiGrading?.startedAt,
        finishedAt: now,
        error,
      },
    };
  }

  return {
    ...room,
    scores: mergeAiGradesToScores(room),
    aiGrading: {
      status: 'done',
      completed: room.aiGrading?.total ?? room.aiGrades.length,
      total: room.aiGrading?.total ?? room.aiGrades.length,
      startedAt: room.aiGrading?.startedAt,
      finishedAt: now,
    },
  };
}

export async function gradeJobWithOpenAI(
  apiKey: string,
  job: ReturnType<typeof collectOpenAnswerGradeJobs>[number],
): Promise<AiGrade> {
  const result = await gradeOpenAnswerWithOpenAI(apiKey, job.question, job.answer);
  return {
    teamId: job.teamId,
    questionId: job.questionId,
    points: result.points,
    reasoning: result.reasoning,
    confidence: result.confidence,
    submittedAt: Date.now(),
  };
}

export function fallbackAiGrade(
  job: ReturnType<typeof collectOpenAnswerGradeJobs>[number],
  message: string,
): AiGrade {
  return {
    teamId: job.teamId,
    questionId: job.questionId,
    points: 0,
    reasoning: `KI kunne ikke vurdere automatisk: ${message}. Gruizmaster bør se over manuelt.`,
    confidence: 'low',
    submittedAt: Date.now(),
  };
}
