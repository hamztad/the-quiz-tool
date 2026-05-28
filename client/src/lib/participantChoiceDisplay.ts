import type { Question } from '@quiz-tool/shared';

/** Hide MC/ordering labels for participants while answering in image-only mode. */
export function shouldHideParticipantChoiceLabels(
  question: Question,
  answered = false,
): boolean {
  return question.imageOnlyOptions === true && !answered;
}
