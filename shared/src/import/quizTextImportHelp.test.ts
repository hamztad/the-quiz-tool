import { describe, expect, it } from 'vitest';
import { parseQuizText } from './parseQuizText.js';
import { QUIZ_TEXT_IMPORT_EXAMPLE } from './quizTextImportHelp.js';

describe('QUIZ_TEXT_IMPORT_EXAMPLE', () => {
  it('parses without errors', () => {
    const { questions, errors, gamePickRequests } = parseQuizText(QUIZ_TEXT_IMPORT_EXAMPLE);
    expect(errors).toEqual([]);
    expect(gamePickRequests).toHaveLength(0);
    expect(questions.map((q) => q.type)).toEqual(['open', 'mc', 'ordering', 'game', 'game']);
    expect(questions[0]?.autoImageProvider).toBe('wikimedia');
    expect(questions[1]?.autoImageProvider).toBe('pixabay');
    expect(questions[2]?.autoImageProvider).toBe('pixabay');
    expect(questions[3]?.game?.gameId).toBe('mathExpression');
    expect(questions[4]?.game?.gameId).toBe('rainbowPuzzle');
    expect(questions[4]?.autoImageProvider).toBe('pixabay');
  });
});
