import type { PublicRoomState } from '@quiz-tool/shared';

export type HostQuestionAction = 'open' | 'lock' | 'reopen';

export function getHostQuestionAction(
  room: Pick<PublicRoomState, 'questionStatus' | 'questionsActivated'>,
  questionId: string,
): HostQuestionAction | null {
  const status = room.questionStatus[questionId] ?? 'locked';
  if (status === 'open') return 'lock';
  if (room.questionsActivated[questionId]) return 'reopen';
  return 'open';
}

export function hostQuestionActionLabel(action: HostQuestionAction): string {
  switch (action) {
    case 'open':
      return 'Åpne spørsmål';
    case 'lock':
      return 'Lås spørsmål';
    case 'reopen':
      return 'Åpne igjen';
  }
}
