import type { PublicRoomState, Question } from '@quiz-tool/shared';
import { formatOrderingOrder } from '@quiz-tool/shared';
import { getHostQuestionDisplayStatus, hostStatusLabels } from './questionDisplayStatus';

export function questionTypeLabel(type: Question['type']): string {
  if (type === 'mc') return 'Flervalg';
  if (type === 'ordering') return 'Rekkefølge';
  if (type === 'game') return 'Spill';
  return 'Åpent';
}

export function getQuestionFasitText(question: Question): string | null {
  if (question.type === 'mc') {
    const correct = question.options?.find((o) => o.isCorrect);
    return correct?.text?.trim() || null;
  }
  if (question.type === 'game') {
    if (question.game?.gameId === 'timerChallenge') {
      return `Stopp klokka: nærmest ${(question.game.targetMs / 1000).toFixed(0)} sekunder vinner.`;
    }
    if (question.game?.gameId === 'rainbowPuzzle') {
      return 'Rainbow Puzzle: høyeste fullførte poengsum vinner.';
    }
    if (question.game?.gameId === 'emojiHunt') {
      return `Emoji-jakt: finn ${question.game.targetCount} emoji raskest mulig.`;
    }
    if (question.game?.gameId === 'dropBall') {
      return `Drop the Ball: ${question.game.totalRounds} brett, ${question.game.obstacleCount} hindre, mynter 1k/2k/3k og +${question.game.allCoinsBonus.toLocaleString('nb-NO')} for alle tre.`;
    }
    if (question.game?.gameId === 'anagram') {
      return `Anagram: ${question.game.answerText || '—'}`;
    }
    if (question.game?.gameId === 'mathExpression') {
      if (question.game.mode === 'single') {
        return `Regnestykke: ${question.game.expression}`;
      }
      return `Regnerace: ${question.game.expressions.join(' · ')}`;
    }
    return 'Spillresultat beregnes automatisk.';
  }
  if (question.type === 'ordering') {
    return formatOrderingOrder(question, question.orderingCorrectOrder) || null;
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
