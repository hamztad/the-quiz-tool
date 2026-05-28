import { describe, expect, it } from 'vitest';
import { createAnagramConfigForAnswer } from '../games/modules/anagram.js';
import { createDefaultDropBallConfig } from '../games/modules/dropBall.js';
import { createDefaultEmojiHuntConfig } from '../games/modules/emojiHunt.js';
import { createDefaultRevealImageConfig } from '../games/modules/revealImage.js';
import type { Question } from '../types/room.js';
import { buildQuizFileExport, parseQuizFile, QUIZ_FILE_FORMAT } from './quizFile.js';
import { questionsToQuizText } from './questionsToQuizText.js';

const sampleQuestion: Question = {
  id: 'q1',
  order: 0,
  type: 'open',
  lines: [{ text: 'Hva er 2+2?', style: 'title' }],
  acceptedAnswers: ['4'],
  maxPoints: 1,
};

describe('buildQuizFileExport', () => {
  it('builds a valid export envelope', () => {
    const data = buildQuizFileExport([sampleQuestion], { title: 'Testquiz' });
    expect(data.format).toBe(QUIZ_FILE_FORMAT);
    expect(data.version).toBe(2);
    expect(data.title).toBe('Testquiz');
    expect(data.questions).toHaveLength(1);
    expect(data.exportedAt).toBeTruthy();
  });
});

describe('parseQuizFile', () => {
  it('accepts a valid export', () => {
    const exported = buildQuizFileExport([sampleQuestion]);
    const parsed = parseQuizFile(exported);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.questions[0].lines[0].text).toBe('Hva er 2+2?');
    }
  });

  it('accepts legacy v1 export without timers', () => {
    const legacy = {
      format: QUIZ_FILE_FORMAT,
      version: 1,
      exportedAt: new Date().toISOString(),
      questions: [sampleQuestion],
    };
    const parsed = parseQuizFile(legacy);
    expect(parsed.ok).toBe(true);
  });

  it('round-trips question timer config', () => {
    const withTimer: Question = {
      ...sampleQuestion,
      timer: { mode: 'preset', preset: '30s' },
    };
    const parsed = parseQuizFile(buildQuizFileExport([withTimer]));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.questions[0].timer).toEqual({ mode: 'preset', preset: '30s' });
    }
  });

  it('rejects unknown format', () => {
    const result = parseQuizFile({ format: 'other', version: 1, exportedAt: 'x', questions: [] });
    expect(result.ok).toBe(false);
  });

  it('rejects empty questions', () => {
    const exported = buildQuizFileExport([]);
    const result = parseQuizFile(exported);
    expect(result.ok).toBe(false);
  });

  it('validates Emoji-jakt game config', () => {
    const exported = buildQuizFileExport([
      {
        id: 'q-emoji',
        order: 0,
        type: 'game',
        gameType: 'emojiHunt',
        lines: [{ text: 'Emoji-jakt', style: 'title' }],
        game: createDefaultEmojiHuntConfig(),
        maxPoints: 5,
      },
    ]);

    expect(parseQuizFile(exported).ok).toBe(true);
    const invalid = JSON.parse(JSON.stringify(exported));
    invalid.questions[0].game.targetCount = 6;
    expect(parseQuizFile(invalid).ok).toBe(false);
  });

  it('validates Drop the Ball game config', () => {
    const exported = buildQuizFileExport([
      {
        id: 'q-drop-ball',
        order: 0,
        type: 'game',
        gameType: 'dropBall',
        lines: [{ text: 'Drop the Ball', style: 'title' }],
        game: createDefaultDropBallConfig(),
        maxPoints: 5,
      },
    ]);

    expect(parseQuizFile(exported).ok).toBe(true);
    const invalid = JSON.parse(JSON.stringify(exported));
    invalid.questions[0].game.obstacleCount = 0;
    expect(parseQuizFile(invalid).ok).toBe(false);
  });

  it('validates Anagram game config', () => {
    const exported = buildQuizFileExport([
      {
        id: 'q-anagram',
        order: 0,
        type: 'game',
        gameType: 'anagram',
        lines: [{ text: 'Løs anagrammet', style: 'title' }],
        game: createAnagramConfigForAnswer('DET ER FINT'),
        maxPoints: 1,
      },
    ]);

    expect(parseQuizFile(exported).ok).toBe(true);
    const invalid = JSON.parse(JSON.stringify(exported));
    invalid.questions[0].game.resultKind = 'ranked';
    expect(parseQuizFile(invalid).ok).toBe(false);
  });

  it('accepts legacy image-only ordering without imageOnlyOptions flag', () => {
    const legacy = {
      format: QUIZ_FILE_FORMAT,
      version: 2,
      exportedAt: new Date().toISOString(),
      questions: [
        {
          id: 'q-ordering',
          order: 0,
          type: 'ordering',
          lines: [{ text: 'Sorter flagg', style: 'title' }],
          orderingItems: [
            {
              id: 'a',
              text: '',
              media: { type: 'image', url: 'https://example.com/no.png', alt: 'Norge' },
            },
            {
              id: 'b',
              text: '',
              media: { type: 'image', url: 'https://example.com/se.png', alt: 'Sverige' },
            },
            {
              id: 'c',
              text: '',
              media: { type: 'image', url: 'https://example.com/dk.png', alt: 'Danmark' },
            },
          ],
          orderingCorrectOrder: ['a', 'b', 'c'],
          maxPoints: 2,
        },
      ],
    };

    const parsed = parseQuizFile(legacy);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.questions[0].orderingItems?.[0].text).toBe('Norge');
      expect(parsed.data.questions[0].orderingItems?.[1].text).toBe('Sverige');
    }
  });

  it('accepts legacy image-only ordering with media but no labels', () => {
    const legacy = {
      format: QUIZ_FILE_FORMAT,
      version: 2,
      exportedAt: new Date().toISOString(),
      questions: [
        {
          id: 'q-ordering',
          order: 0,
          type: 'ordering',
          lines: [{ text: 'Sorter flagg', style: 'title' }],
          orderingItems: [
            { id: 'a', text: '', media: { type: 'image', url: 'https://example.com/no.png' } },
            { id: 'b', text: '', media: { type: 'image', url: 'https://example.com/se.png' } },
            { id: 'c', text: '', media: { type: 'image', url: 'https://example.com/dk.png' } },
          ],
          orderingCorrectOrder: ['a', 'b', 'c'],
          maxPoints: 2,
        },
      ],
    };

    const parsed = parseQuizFile(legacy);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.questions[0].imageOnlyOptions).toBe(true);
    }
  });

  it('accepts reveal image exports with placeholder MC choices', () => {
    const game = createDefaultRevealImageConfig();
    game.correctAnswer = 'Oslo';
    game.acceptedAnswers = ['Oslo'];

    const exported = buildQuizFileExport([
      {
        id: 'q-reveal',
        order: 0,
        type: 'game',
        gameType: 'revealImage',
        lines: [{ text: 'Avslør bildet', style: 'title' }],
        game,
        maxPoints: 10,
      },
    ]);

    const parsed = parseQuizFile(exported);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.questions[0].game?.gameId).toBe('revealImage');
      expect(parsed.data.questions[0].game?.choices).toBeUndefined();
    }
  });

  it('validates ordering questions', () => {
    const exported = buildQuizFileExport([
      {
        id: 'q-ordering',
        order: 0,
        type: 'ordering',
        lines: [{ text: 'Sorter fra nord til sør', style: 'title' }],
        orderingDirectionTop: 'Nord',
        orderingDirectionBottom: 'Sør',
        orderingItems: [
          { id: 'a', text: 'Norge' },
          { id: 'b', text: 'Tyskland' },
          { id: 'c', text: 'Italia' },
        ],
        orderingCorrectOrder: ['a', 'b', 'c'],
        maxPoints: 2,
      },
    ]);

    expect(parseQuizFile(exported).ok).toBe(true);
    const invalid = JSON.parse(JSON.stringify(exported));
    invalid.questions[0].orderingItems[2].text = 'Norge';
    expect(parseQuizFile(invalid).ok).toBe(false);
  });
});

describe('questionsToQuizText', () => {
  it('serializes open and mc questions', () => {
    const text = questionsToQuizText([
      sampleQuestion,
      {
        id: 'q2',
        order: 1,
        type: 'mc',
        lines: [{ text: 'Størst planet?', style: 'title' }],
        options: [
          { id: 'o1', text: 'Jupiter', isCorrect: true },
          { id: 'o2', text: 'Mars', isCorrect: false },
        ],
        maxPoints: 1,
      },
    ]);
    expect(text).toContain('Q Hva er 2+2?');
    expect(text).toContain('A 4');
    expect(text).toContain('MC Størst planet?');
    expect(text).toContain('*Jupiter');
    expect(text).toContain('Mars');
  });

  it('serializes ordering questions with direction and correct order', () => {
    const text = questionsToQuizText([
      {
        id: 'q-ordering',
        order: 0,
        type: 'ordering',
        lines: [{ text: 'Sorter fra nord til sør', style: 'title' }],
        orderingDirectionTop: 'Nord',
        orderingDirectionBottom: 'Sør',
        orderingItems: [
          { id: 'a', text: 'Norge' },
          { id: 'b', text: 'Tyskland' },
          { id: 'c', text: 'Italia' },
        ],
        orderingCorrectOrder: ['a', 'b', 'c'],
        maxPoints: 2,
      },
    ]);

    expect(text).toContain('ORDER Sorter fra nord til sør');
    expect(text).toContain('Retning: Nord → Sør');
    expect(text).toContain('- Norge');
  });
});
