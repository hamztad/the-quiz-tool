import { migrateQuestionChoiceLabelsFromMedia } from '../choice/choiceValidation.js';
import { sanitizeRevealImageChoices } from '../games/modules/revealImage.js';
import { isMediaAttachment } from '../media/mediaAttachment.js';
import { isValidQuestionTimerConfig } from '../timing/timerConfig.js';
import type { MediaAttachment, McOption, OrderingItem, Question } from '../types/room.js';

const VALID_MEDIA_SOURCES = new Set(['pixabay', 'wikimedia', 'upload']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeMediaAttachmentForImport(value: unknown): MediaAttachment | undefined {
  if (isMediaAttachment(value)) return value;
  if (!isRecord(value) || value.type !== 'image' || typeof value.url !== 'string') {
    return undefined;
  }
  const url = value.url.trim();
  if (!url || url.length > 2_000) return undefined;

  const media: MediaAttachment = { type: 'image', url };
  if (typeof value.alt === 'string' && value.alt.trim()) media.alt = value.alt.trim();
  if (typeof value.previewUrl === 'string' && value.previewUrl.trim()) {
    media.previewUrl = value.previewUrl.trim();
  }
  if (typeof value.title === 'string' && value.title.trim()) media.title = value.title.trim();
  if (typeof value.creator === 'string' && value.creator.trim()) media.creator = value.creator.trim();
  if (typeof value.license === 'string' && value.license.trim()) media.license = value.license.trim();
  if (typeof value.photographer === 'string' && value.photographer.trim()) {
    media.photographer = value.photographer.trim();
  }
  if (typeof value.pageUrl === 'string' && value.pageUrl.trim()) media.pageUrl = value.pageUrl.trim();
  if (typeof value.attributionText === 'string' && value.attributionText.trim()) {
    media.attributionText = value.attributionText.trim();
  }
  if (
    typeof value.source === 'string' &&
    VALID_MEDIA_SOURCES.has(value.source)
  ) {
    media.source = value.source as MediaAttachment['source'];
  }
  return isMediaAttachment(media) ? media : undefined;
}

function sanitizeChoiceItemForImport<T extends { text?: unknown; media?: unknown }>(
  item: T,
): T & { text: string; media?: MediaAttachment } {
  const text = typeof item.text === 'string' ? item.text : '';
  const media = sanitizeMediaAttachmentForImport(item.media);
  return {
    ...item,
    text,
    ...(media ? { media } : {}),
  };
}

function isLegacyImageOnlyChoices(
  items: Array<{ text: string; media?: MediaAttachment }>,
): boolean {
  if (items.length === 0) return false;
  const allHaveImages = items.every((item) => Boolean(item.media?.url?.trim()));
  const anyMissingText = items.some((item) => !item.text.trim());
  return allHaveImages && anyMissingText;
}

function prepareRevealImageGameForImport(game: Record<string, unknown>): Record<string, unknown> {
  const next = { ...game };
  if (Array.isArray(next.choices)) {
    const sanitized = sanitizeRevealImageChoices(
      next.choices as { id: string; text: string; isCorrect: boolean }[],
    );
    if (sanitized === undefined) {
      delete next.choices;
    } else {
      next.choices = sanitized;
    }
  }
  return next;
}

/** Normalize legacy quiz file questions so stricter editor rules still accept older exports. */
export function prepareQuizFileQuestionForImport(value: unknown): unknown {
  if (!isRecord(value)) return value;

  let question = JSON.parse(JSON.stringify(value)) as Question;

  if (Array.isArray(question.media)) {
    question.media = question.media
      .map((item) => sanitizeMediaAttachmentForImport(item))
      .filter((item): item is MediaAttachment => item !== undefined);
  }

  if (question.type === 'mc' && Array.isArray(question.options)) {
    question.options = question.options.map((option) =>
      sanitizeChoiceItemForImport(option),
    ) as McOption[];
  }

  if (question.type === 'ordering' && Array.isArray(question.orderingItems)) {
    question.orderingItems = question.orderingItems.map((item) =>
      sanitizeChoiceItemForImport(item),
    ) as OrderingItem[];
  }

  question = migrateQuestionChoiceLabelsFromMedia(question);

  if (question.type === 'mc' && question.options) {
    if (!question.imageOnlyOptions && isLegacyImageOnlyChoices(question.options)) {
      question = { ...question, imageOnlyOptions: true };
    }
  }

  if (question.type === 'ordering' && question.orderingItems) {
    if (!question.imageOnlyOptions && isLegacyImageOnlyChoices(question.orderingItems)) {
      question = { ...question, imageOnlyOptions: true };
    }
  }

  if (question.type === 'game' && isRecord(question.game)) {
    const gameId = question.game.gameId;
    if (gameId === 'revealImage') {
      question = {
        ...question,
        gameType: 'revealImage',
        game: prepareRevealImageGameForImport(question.game) as unknown as Question['game'],
      };
    } else if (typeof gameId === 'string') {
      question = { ...question, gameType: gameId as Question['gameType'] };
    }
  }

  if (question.timer !== undefined && !isValidQuestionTimerConfig(question.timer)) {
    const { timer: _timer, ...rest } = question;
    question = rest as Question;
  }

  return question;
}

export function prepareQuizFileQuestionsForImport(questions: unknown[]): unknown[] {
  return questions.map(prepareQuizFileQuestionForImport);
}
