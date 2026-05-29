import {
  serializeOrderingAnswer,
  shuffleOrderingItems,
  type Answer,
  type Question,
} from '@quiz-tool/shared';

export function prepareParticipantQuestionDraft(
  question: Question,
  answerDrafts: Record<string, string>,
  getMyAnswer: (questionId: string) => Answer | undefined,
): string {
  const ans = getMyAnswer(question.id);
  const storedValue =
    answerDrafts[question.id] ?? (ans?.value && ans.value !== '[hidden]' ? ans.value : '');
  if (question.type === 'ordering' && !storedValue) {
    return serializeOrderingAnswer(shuffleOrderingItems(question.orderingItems ?? []));
  }
  return storedValue;
}
