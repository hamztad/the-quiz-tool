import type { Question } from '@quiz-tool/shared';

/** Format a team's stored answer for display in overview or detail view. */
export function formatTeamAnswerDisplay(
  question: Question,
  value: string | undefined,
): string | null {
  if (!value || value === '[hidden]') return null;
  if (question.type === 'mc') {
    const option = question.options?.find((o) => o.id === value);
    return option?.text?.trim() || value;
  }
  return value.trim() || null;
}

export function getTeamQuestionBadge(
  status: 'open' | 'locked',
  answered: boolean,
): { variant: 'open' | 'submitted' | 'locked'; label: string } {
  if (status === 'locked') {
    return { variant: 'locked', label: 'Låst' };
  }
  if (answered) {
    return { variant: 'submitted', label: 'Besvart' };
  }
  return { variant: 'open', label: 'Åpent' };
}
