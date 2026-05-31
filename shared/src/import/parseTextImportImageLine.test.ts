import { describe, expect, it } from 'vitest';
import { parseTextImportImageLine } from './parseTextImportImageLine.js';
import { parseQuizText } from './parseQuizText.js';

describe('parseTextImportImageLine', () => {
  it('parses ARP-P and ARP-W', () => {
    expect(parseTextImportImageLine('ARP-P')).toEqual({ ok: true, provider: 'pixabay' });
    expect(parseTextImportImageLine('arp-w')).toEqual({ ok: true, provider: 'wikimedia' });
    expect(parseTextImportImageLine('RP')).toEqual({ ok: true, provider: 'pixabay' });
  });

  it('rejects unknown suffix', () => {
    expect(parseTextImportImageLine('ARP-T').ok).toBe(false);
  });
});

describe('parseQuizText ARP', () => {
  it('sets autoImageProvider on open and mc', () => {
    const { questions, errors } = parseQuizText(`Q Eiffeltårnet?
ARP-W
A Paris

MC Størst planet?
ARP-P
*Jupiter
Mars`);
    expect(errors).toEqual([]);
    expect(questions[0]?.autoImageProvider).toBe('wikimedia');
    expect(questions[1]?.autoImageProvider).toBe('pixabay');
  });

  it('sets autoImageProvider on game questions', () => {
    const { questions, errors } = parseQuizText(`GAME Rainbow Puzzle
ARP-W`);
    expect(errors).toEqual([]);
    expect(questions[0]?.type).toBe('game');
    expect(questions[0]?.autoImageProvider).toBe('wikimedia');
  });
});
