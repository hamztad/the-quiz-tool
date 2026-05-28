import { isSelfPacedQuiz, isTeamQuestionLocked } from '@quiz-tool/shared';
import type { Answer, Question } from '@quiz-tool/shared';
import type { RoomRecord } from '../store/RoomStore.js';
import { lockQuestionForTeam } from './selfPacedService.js';
import { scoreAutoAnswer, upsertScore } from './gradingService.js';

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
  if (room.settings.finalResultLocked) {
    throw new Error('Endelig resultat er låst.');
  }
  if (room.settings.teamsLockedOut) {
    throw new Error('Quizen er avsluttet for deltakere.');
  }

  const selfPaced = isSelfPacedQuiz(room.schedule);
  if (
    selfPaced &&
    isTeamQuestionLocked(room.teamQuestionLocks, teamId, questionId)
  ) {
    throw new Error('Oppgaven er låst etter innsending.');
  }

  const status = room.questionStatus[questionId];
  if (!selfPaced && status !== 'open') {
    throw new Error('Spørsmålet er ikke åpent for svar.');
  }

  const question = room.questions.find((q) => q.id === questionId);
  if (!question) {
    throw new Error('Spørsmål finnes ikke.');
  }

  const existing = room.answers.find((a) => a.teamId === teamId && a.questionId === questionId);
  if (existing && isUpdate) {
    let next = applyAnswer(room, teamId, questionId, value, question);
    if (selfPaced && question.type !== 'game') {
      next = lockQuestionForTeam(next, teamId, questionId);
    }
    return next;
  }
  if (existing && !isUpdate) {
    throw new Error('Svar finnes allerede. Bruk oppdatering.');
  }
  if (!existing && isUpdate) {
    throw new Error('Ingen svar å oppdatere.');
  }

  let next = applyAnswer(room, teamId, questionId, value, question);
  if (selfPaced && question.type !== 'game') {
    next = lockQuestionForTeam(next, teamId, questionId);
  }
  return next;
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
  if (question.type === 'mc' || question.type === 'ordering') {
    const autoScore = scoreAutoAnswer(teamId, questionId, value.trim(), question);
    if (autoScore) {
      scores = upsertScore(scores, autoScore);
    }
  }

  return {
    ...room,
    answers: [...otherAnswers, answer],
    answeredByTeam: markAnswered(room, teamId, questionId),
    scores,
  };
}
