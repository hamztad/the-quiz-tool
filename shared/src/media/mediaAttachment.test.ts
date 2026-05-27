import { describe, expect, it } from 'vitest';
import { choiceItemHasContent, getChoiceItemLabel } from './mediaAttachment.js';

describe('choice item helpers', () => {
  it('accepts text or image content', () => {
    expect(choiceItemHasContent({ text: 'Oslo' })).toBe(true);
    expect(choiceItemHasContent({ text: '', media: { type: 'image', url: 'https://x.test/a.jpg' } })).toBe(
      true,
    );
    expect(choiceItemHasContent({ text: '  ' })).toBe(false);
  });

  it('labels image-only items', () => {
    expect(
      getChoiceItemLabel({
        text: '',
        media: { type: 'image', url: 'https://x.test/a.jpg', alt: 'Eiffeltårnet' },
      }),
    ).toBe('Eiffeltårnet');
  });
});
