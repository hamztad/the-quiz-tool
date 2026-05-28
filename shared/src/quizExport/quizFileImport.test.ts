import { describe, expect, it } from 'vitest';
import { isQuizFileQuestion, QUIZ_FILE_FORMAT, parseQuizFile } from './quizFile.js';
import { prepareQuizFileQuestionsForImport } from './quizFileImport.js';
import { prepareQuizFileQuestionForImport } from './quizFileImport.js';

describe('prepareQuizFileQuestionForImport', () => {
  it('sets imageOnlyOptions for image-only ordering items', () => {
    const prepared = prepareQuizFileQuestionForImport({
      id: 'q1',
      order: 0,
      type: 'ordering',
      lines: [{ text: 'Sorter', style: 'title' }],
      orderingItems: [
        { id: 'a', text: '', media: { type: 'image', url: 'https://example.com/a.png' } },
        { id: 'b', text: '', media: { type: 'image', url: 'https://example.com/b.png' } },
        { id: 'c', text: '', media: { type: 'image', url: 'https://example.com/c.png' } },
      ],
      orderingCorrectOrder: ['a', 'b', 'c'],
      maxPoints: 1,
    }) as { imageOnlyOptions?: boolean; orderingItems?: { media?: { url?: string }; text: string }[] };

    expect(prepared.imageOnlyOptions).toBe(true);
    expect(prepared.orderingItems?.every((item) => item.media?.url)).toBe(true);
    expect(isQuizFileQuestion(prepared)).toBe(true);
  });

  it('prepares the same whether called once or via list helper', () => {
    const question = {
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
    };

    expect(prepareQuizFileQuestionForImport(question)).toEqual(
      prepareQuizFileQuestionsForImport([question])[0],
    );
  });

  it('parseQuizFile accepts prepared legacy ordering envelope', () => {
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

    const [prepared] = prepareQuizFileQuestionsForImport(legacy.questions);
    expect(isQuizFileQuestion(prepared)).toBe(true);

    const parsed = parseQuizFile(legacy);
    expect(parsed.ok, !parsed.ok ? parsed.error : '').toBe(true);
  });
});
