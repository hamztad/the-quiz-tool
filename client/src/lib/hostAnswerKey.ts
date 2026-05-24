import type { PublicRoomState, Question } from '@quiz-tool/shared';
import { getHostQuestionDisplayStatus, hostStatusLabels } from './questionDisplayStatus';

export function questionTypeLabel(type: Question['type']): string {
  return type === 'mc' ? 'Flervalg' : 'Åpent';
}

export function getQuestionFasitText(question: Question): string | null {
  if (question.type === 'mc') {
    const correct = question.options?.find((o) => o.isCorrect);
    return correct?.text?.trim() || null;
  }
  const accepted = (question.acceptedAnswers ?? []).filter((a) => a.trim());
  if (accepted.length === 0) return null;
  return accepted.join(' · ');
}

export function describeHostQuestionRuntimeStatus(
  room: PublicRoomState,
  question: Question,
): string {
  const runtimeStatus = room.questionStatus[question.id] ?? 'locked';
  const displayStatus = getHostQuestionDisplayStatus(room, question, runtimeStatus);
  const parts: string[] = [hostStatusLabels[displayStatus]];

  const teamCount = room.teams.length;
  if (teamCount === 0) return parts.join(' · ');

  const answeredCount = room.teams.filter((t) =>
    room.answeredByTeam[t.id]?.includes(question.id),
  ).length;
  parts.push(`${answeredCount}/${teamCount} besvart`);

  const peerGradedTeams = new Set(
    room.peerGrades
      .filter((pg) => pg.questionId === question.id)
      .map((pg) => pg.targetTeamId),
  );
  const scoredTeams = new Set(
    room.scores.filter((s) => s.questionId === question.id).map((s) => s.teamId),
  );
  const totalScored = new Set([...peerGradedTeams, ...scoredTeams]).size;
  if (totalScored > 0 && room.phase !== 'lobby') {
    parts.push(`${totalScored}/${teamCount} poengsatt`);
  }

  return parts.join(' · ');
}
