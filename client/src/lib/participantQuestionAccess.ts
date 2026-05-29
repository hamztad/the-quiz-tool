import {
  canTeamWorkOnQuestion,
  isQuestionRevealedToTeam,
  isSelfPacedQuiz,
  isTeamQuestionLocked,
  type PublicRoomState,
  type Question,
} from '@quiz-tool/shared';

export type ParticipantQuestionViewState = 'available' | 'locked' | 'submitted' | 'closed';

export function getParticipantQuestionViewState(
  room: PublicRoomState,
  teamId: string,
  question: Question,
): ParticipantQuestionViewState {
  if (isSelfPacedQuiz(room.schedule)) {
    if (room.settings.teamsLockedOut || room.phase !== 'live') {
      return 'closed';
    }
    if (question.type !== 'game' && isTeamQuestionLocked(room.teamQuestionLocks, teamId, question.id)) {
      return 'submitted';
    }
    if (canTeamWorkOnQuestion(room.schedule, room.phase, room.settings.teamsLockedOut, room.teamQuestionLocks, teamId, question)) {
      return 'available';
    }
    return 'locked';
  }

  const status = room.questionStatus[question.id] ?? 'locked';
  const revealed = isQuestionRevealedToTeam(room, question.id);

  if (status === 'open' && revealed) {
    return 'available';
  }

  if (revealed && status !== 'open') {
    return 'closed';
  }

  return 'locked';
}

export function participantQuestionLockedMessage(
  state: Exclude<ParticipantQuestionViewState, 'available'>,
): string {
  switch (state) {
    case 'submitted':
      return 'Du har sendt inn denne oppgaven og kan ikke endre svaret.';
    case 'closed':
      return 'Oppgavevinduet er stengt.';
    case 'locked':
    default:
      return 'Denne oppgaven er ikke åpnet ennå.';
  }
}
