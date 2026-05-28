import { describe, expect, it } from 'vitest';
import type { McOption, OrderingItem } from '../types/room.js';
import {
  MC_ALL_OPTIONS_NEED_TEXT,
  MC_IMAGE_ONLY_NEEDS_IMAGES,
  ORDERING_ALL_ITEMS_NEED_TEXT,
  ORDERING_IMAGE_ONLY_NEEDS_IMAGES,
  inferChoiceItemTextFromMedia,
  migrateQuestionChoiceLabelsFromMedia,
  validateMcChoices,
  validateOrderingChoiceItems,
} from './choiceValidation.js';

const image = { type: 'image' as const, url: 'https://example.com/a.jpg', alt: 'Norge' };

describe('choiceValidation', () => {
  it('requires text on every MC option', () => {
    const options: McOption[] = [
      { id: '1', text: 'Norge', isCorrect: true },
      { id: '2', text: '', isCorrect: false, media: image },
    ];
    expect(validateMcChoices(options, false)).toEqual([MC_ALL_OPTIONS_NEED_TEXT]);
  });

  it('requires images when image-only mode is enabled', () => {
    const options: McOption[] = [
      { id: '1', text: 'Norge', isCorrect: true, media: image },
      { id: '2', text: 'Sverige', isCorrect: false },
    ];
    expect(validateMcChoices(options, true)).toEqual([MC_IMAGE_ONLY_NEEDS_IMAGES]);
  });

  it('requires text on every ordering item', () => {
    const items: OrderingItem[] = [
      { id: 'a', text: 'Norge' },
      { id: 'b', text: '', media: image },
    ];
    expect(validateOrderingChoiceItems(items, false)).toEqual([ORDERING_ALL_ITEMS_NEED_TEXT]);
  });

  it('migrates legacy image-only labels from alt text', () => {
    const migrated = migrateQuestionChoiceLabelsFromMedia({
      id: 'q1',
      order: 0,
      type: 'mc',
      lines: [{ text: 'Flagg', style: 'title' }],
      maxPoints: 1,
      options: [{ id: '1', text: '', isCorrect: true, media: image }],
    });
    expect(migrated.options?.[0].text).toBe('Norge');
    expect(inferChoiceItemTextFromMedia({ text: '', media: image })).toBe('Norge');
  });
});
