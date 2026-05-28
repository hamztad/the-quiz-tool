import { describe, expect, it } from 'vitest';
import { choiceItemHasContent, getChoiceItemLabel } from './mediaAttachment.js';

describe('choice item helpers', () => {
  it('requires text for choice content', () => {
    expect(choiceItemHasContent({ text: 'Oslo' })).toBe(true);
    expect(choiceItemHasContent({ text: '', media: { type: 'image', url: 'https://x.test/a.jpg' } })).toBe(
      false,
    );
    expect(choiceItemHasContent({ text: '  ' })).toBe(false);
  });

  it('uses text label when present', () => {
    expect(
      getChoiceItemLabel({
        text: 'Norge',
        media: { type: 'image', url: 'https://x.test/a.jpg' },
      }),
    ).toBe('Norge');
    expect(
      getChoiceItemLabel({
        text: '',
        media: { type: 'image', url: 'https://x.test/a.jpg', alt: 'Eiffeltårnet' },
      }),
    ).toBe('—');
  });
});
