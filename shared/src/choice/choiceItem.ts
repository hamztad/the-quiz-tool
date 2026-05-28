export {
  choiceItemHasContent,
  getChoiceItemLabel,
  type ChoiceItemWithMedia,
} from '../media/mediaAttachment.js';
export {
  choiceItemHasImage,
  choiceItemHasRequiredText,
  inferChoiceItemTextFromMedia,
  migrateQuestionChoiceLabelsFromMedia,
  migrateQuestionsChoiceLabelsFromMedia,
  MC_ALL_OPTIONS_NEED_TEXT,
  MC_IMAGE_ONLY_NEEDS_IMAGES,
  ORDERING_ALL_ITEMS_NEED_TEXT,
  ORDERING_IMAGE_ONLY_NEEDS_IMAGES,
  validateMcChoices,
  validateOrderingChoiceItems,
} from './choiceValidation.js';
