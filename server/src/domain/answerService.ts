import type { Answer, Question } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/RoomStore.js';
import { scoreMcAnswer, upsertScore } from './gradingService.js';

function markAnswered(room: RoomRecord, teamId: string, questionId: string): Record<string, string[]> {
  const current = room.answeredByTeam[teamId] ?? [];
  if (current.includes(questionId)) return room.answeredByTeam;
  return {
    ...room.answeredByTeam,
    [teamId]: [...current, questionId],
  };
}

export function submitOrUpdateAnswer(
  room: RoomRecord,
  teamId: string,
  questionId: string,
  value: string,
  isUpdate: boolean,
): RoomRecord {
  if (room.phase !== 'live') {
    throw new Error('Quizen er ikke startet ennå.');
  }

  const status = room.questionStatus[questionId];
  if (status !== 'open') {
    throw new Error('Spørsmålet er ikke åpent for svar.');
  }

  const question = room.questions.find((q) => q.id === questionId);
  if (!question) {
    throw new Error('Spørsmål finnes ikke.');
  }

  const existing = room.answers.find((a) => a.teamId === teamId && a.questionId === questionId);
  if (existing && isUpdate) {
    return applyAnswer(room, teamId, questionId, value, question);
  }
  if (existing && !isUpdate) {
    throw new Error('Svar finnes allerede. Bruk oppdatering.');
  }
  if (!existing && isUpdate) {
    throw new Error('Ingen svar å oppdatere.');
  }

  return applyAnswer(room, teamId, questionId, value, question);
}

function applyAnswer(
  room: RoomRecord,
  teamId: string,
  questionId: string,
  value: string,
  question: Question,
): RoomRecord {
  const now = Date.now();
  const answer: Answer = {
    teamId,
    questionId,
    value: value.trim(),
    updatedAt: now,
  };

  const otherAnswers = room.answers.filter(
    (a) => !(a.teamId === teamId && a.questionId === questionId),
  );

  let scores = room.scores;
  if (question.type === 'mc') {
    const mcScore = scoreMcAnswer(teamId, questionId, value.trim(), question);
    if (mcScore) {
      scores = upsertScore(scores, mcScore);
    }
  }

  return {
    ...room,
    answers: [...otherAnswers, answer],
    answeredByTeam: markAnswered(room, teamId, questionId),
    scores,
  };
}
