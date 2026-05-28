import { describe, expect, it } from 'vitest';
import {
  getGameplayImageAlt,
  getMediaAttributionDetails,
  getParticipantMediaCreditsMode,
  mediaHasAttribution,
} from './mediaAttribution.js';

describe('mediaAttribution', () => {
  it('uses generic alt during gameplay', () => {
    expect(getGameplayImageAlt('Spillbilde')).toBe('Spillbilde');
    expect(getGameplayImageAlt()).toBe('Illustrasjonsbilde');
  });

  it('detects when attribution metadata exists', () => {
    expect(
      mediaHasAttribution({
        type: 'image',
        url: 'https://example.com/flag-of-norway.jpg',
        pageUrl: 'https://commons.wikimedia.org/wiki/File:Flag_of_Norway.svg',
        title: 'Flag of Norway',
        alt: 'Flag of Norway',
      }),
    ).toBe(true);
  });

  it('defers credits while question is open', () => {
    expect(getParticipantMediaCreditsMode('open')).toBe('deferred');
    expect(getParticipantMediaCreditsMode('locked')).toBe('revealed');
  });

  it('builds attribution details without exposing filenames in helper', () => {
    const details = getMediaAttributionDetails({
      type: 'image',
      url: 'https://example.com/eiffel.jpg',
      source: 'wikimedia',
      creator: 'Jane Doe',
      license: 'CC BY-SA 4.0',
      pageUrl: 'https://commons.wikimedia.org/wiki/Eiffel_Tower',
    });
    expect(details?.creator).toBe('Jane Doe');
    expect(details?.sourceLabel).toBe('Wikimedia Commons');
    expect(details?.pageUrl).toContain('wikimedia');
  });
});
