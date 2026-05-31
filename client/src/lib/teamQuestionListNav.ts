export const PARTICIPANT_BACK_TO_QUIZ_LABEL = 'Tilbake til Gruizen';

export function teamQuestionListAnchorId(questionId: string): string {
  return `team-question-${questionId}`;
}

export function scrollTeamQuestionIntoView(questionId: string): boolean {
  const el = document.getElementById(teamQuestionListAnchorId(questionId));
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}
