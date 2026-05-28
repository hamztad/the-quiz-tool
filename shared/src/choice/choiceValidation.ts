import {
  choiceItemHasRequiredText,
  type ChoiceItemWithMedia,
} from '../media/mediaAttachment.js';
import type { McOption, OrderingItem, Question } from '../types/room.js';

export { choiceItemHasRequiredText } from '../media/mediaAttachment.js';

export const MC_ALL_OPTIONS_NEED_TEXT = 'Alle alternativer må ha tekst.';
export const MC_IMAGE_ONLY_NEEDS_IMAGES =
  'Når «Bruk kun bildene» er valgt, må alle alternativer ha bilde.';
export const ORDERING_ALL_ITEMS_NEED_TEXT = 'Alle elementer må ha tekst.';
export const ORDERING_IMAGE_ONLY_NEEDS_IMAGES =
  'Når «Bruk kun bildene» er valgt, må alle elementer ha bilde.';

export function choiceItemHasImage(item: ChoiceItemWithMedia): boolean {
  return Boolean(item.media?.url?.trim());
}

/** Fill missing labels from image metadata (import/legacy), never invent generic placeholders. */
export function inferChoiceItemTextFromMedia(item: ChoiceItemWithMedia): string {
  const trimmed = item.text.trim();
  if (trimmed) return trimmed;
  const fromAlt = item.media?.alt?.trim();
  if (fromAlt) return fromAlt;
  const fromTitle = item.media?.title?.trim();
  if (fromTitle) return fromTitle;
  return '';
}

export function migrateQuestionChoiceLabelsFromMedia(question: Question): Question {
  if (question.type === 'mc' && question.options) {
    return {
      ...question,
      options: question.options.map((option) => ({
        ...option,
        text: inferChoiceItemTextFromMedia(option),
      })),
    };
  }
  if (question.type === 'ordering' && question.orderingItems) {
    return {
      ...question,
      orderingItems: question.orderingItems.map((item) => ({
        ...item,
        text: inferChoiceItemTextFromMedia(item),
      })),
    };
  }
  return question;
}

export function migrateQuestionsChoiceLabelsFromMedia(questions: Question[]): Question[] {
  return questions.map(migrateQuestionChoiceLabelsFromMedia);
}

export function validateMcChoices(
  options: McOption[] | undefined,
  imageOnlyOptions: boolean | undefined,
): string[] {
  const errors: string[] = [];
  const list = options ?? [];
  if (list.length === 0) return errors;

  if (
    !imageOnlyOptions &&
    list.some((option) => !choiceItemHasRequiredText(option))
  ) {
    errors.push(MC_ALL_OPTIONS_NEED_TEXT);
  }
  if (
    imageOnlyOptions &&
    list.some((option) => !choiceItemHasImage(option))
  ) {
    errors.push(MC_IMAGE_ONLY_NEEDS_IMAGES);
  }
  return errors;
}

export function validateOrderingChoiceItems(
  items: OrderingItem[] | undefined,
  imageOnlyOptions: boolean | undefined,
): string[] {
  const errors: string[] = [];
  const list = items ?? [];
  if (list.length === 0) return errors;

  if (
    !imageOnlyOptions &&
    list.some((item) => !choiceItemHasRequiredText(item))
  ) {
    errors.push(ORDERING_ALL_ITEMS_NEED_TEXT);
  }
  if (
    imageOnlyOptions &&
    list.some((item) => !choiceItemHasImage(item))
  ) {
    errors.push(ORDERING_IMAGE_ONLY_NEEDS_IMAGES);
  }
  return errors;
}
