import type { Server } from 'socket.io';
import {
  collectOpenAnswerGradeJobs,
  mergeAiGradesToScores,
} from '@quiz-tool/shared';
import {
  applyAiGradeResult,
  fallbackAiGrade,
  finishAiGradingRun,
  gradeJobWithOpenAI,
  prepareAiGradingRun,
} from './aiGradingService.js';
import { roomStore } from '../store/activeRoomStore.js';
import { publishRoomState } from '../socket/emitRoomState.js';

export async function runAiGradingBatch(
  io: Server,
  roomId: string,
  apiKey: string,
): Promise<void> {
  const initial = roomStore.get(roomId);
  if (!initial) return;

  let current = initial;
  let jobs;
  try {
    const prepared = prepareAiGradingRun(initial);
    jobs = prepared.jobs;
    current = prepared.room;
    roomStore.update(roomId, () => current);
    publishRoomState(io, roomId);
  } catch (err) {
    return;
  }

  let completed = 0;
  try {
    for (const job of jobs) {
      let grade;
      try {
        grade = await gradeJobWithOpenAI(apiKey, job);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'ukjent feil';
        grade = fallbackAiGrade(job, message);
      }
      completed += 1;
      current = applyAiGradeResult(current, grade, completed);
      roomStore.update(roomId, () => current);
      publishRoomState(io, roomId);
    }

    roomStore.update(roomId, (r) => finishAiGradingRun(r));
    publishRoomState(io, roomId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'KI-retting feilet.';
    roomStore.update(roomId, (r) => finishAiGradingRun(r, message));
    publishRoomState(io, roomId);
  }
}

/** Selvgående: grade one open answer right after submit (does not reset other aiGrades). */
export async function runIncrementalAiGrade(
  io: Server,
  roomId: string,
  apiKey: string,
  teamId: string,
  questionId: string,
): Promise<void> {
  const initial = roomStore.get(roomId);
  if (!initial || initial.settings.openAnswerGradingMode !== 'ai') return;

  const jobs = collectOpenAnswerGradeJobs(initial.questions, initial.answers).filter(
    (job) => job.teamId === teamId && job.questionId === questionId,
  );
  if (jobs.length === 0) return;

  const job = jobs[0]!;
  let grade;
  try {
    grade = await gradeJobWithOpenAI(apiKey, job);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ukjent feil';
    grade = fallbackAiGrade(job, message);
  }

  roomStore.update(roomId, (room) => {
    const filtered = room.aiGrades.filter(
      (g) => !(g.teamId === grade.teamId && g.questionId === grade.questionId),
    );
    const withGrade = {
      ...room,
      aiGrades: [...filtered, grade],
    };
    return { ...withGrade, scores: mergeAiGradesToScores(withGrade) };
  });
  publishRoomState(io, roomId);
}
