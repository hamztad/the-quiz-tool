import { describe, expect, it } from 'vitest';
import { finalizeParseResult } from './finalizeParseResult.js';
import { parseQuizText } from './parseQuizText.js';

describe('finalizeParseResult', () => {
  it('adds game question when pick is provided', () => {
    const raw = parseQuizText('GAME\nTittel');
    expect(raw.gamePickRequests).toHaveLength(1);
    const result = finalizeParseResult(raw, {
      [raw.gamePickRequests[0].tempId]: 'timerChallenge',
    });
    expect(result.errors).toHaveLength(0);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].game?.gameId).toBe('timerChallenge');
    expect(result.gamePickRequests).toHaveLength(0);
  });

  it('keeps autoImageProvider on game pick requests', () => {
    const raw = parseQuizText('GAME\nTittel\nARP-W');
    expect(raw.gamePickRequests[0]?.autoImageProvider).toBe('wikimedia');
    const result = finalizeParseResult(raw, {
      [raw.gamePickRequests[0].tempId]: 'timerChallenge',
    });
    expect(result.questions[0]?.autoImageProvider).toBe('wikimedia');
  });
});
