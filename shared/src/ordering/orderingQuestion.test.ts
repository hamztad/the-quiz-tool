import { describe, expect, it } from 'vitest';
import type { Question } from '../types/room.js';
import {
  parseOrderingAnswer,
  scoreOrderingAnswer,
  serializeOrderingAnswer,
  shuffleOrderingItems,
  validateOrderingQuestion,
} from './orderingQuestion.js';

const question: Question = {
  id: 'q1',
  order: 0,
  type: 'ordering',
  lines: [{ text: 'Sorter fra nord til sør', style: 'title' }],
  orderingDirectionTop: 'Nord',
  orderingDirectionBottom: 'Sør',
  orderingItems: [
    { id: 'norway', text: 'Norge' },
    { id: 'germany', text: 'Tyskland' },
    { id: 'italy', text: 'Italia' },
  ],
  orderingCorrectOrder: ['norway', 'germany', 'italy'],
  maxPoints: 2,
};

describe('ordering questions', () => {
  it('validates 3-5 unique non-empty items with matching correct order', () => {
    expect(validateOrderingQuestion(question)).toEqual([]);
    expect(
      validateOrderingQuestion({
        orderingItems: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'A' },
        ],
        orderingCorrectOrder: ['a', 'b'],
      }),
    ).toEqual(expect.arrayContaining(['rekkefølge må ha 3-5 elementer.', 'rekkefølge må ha unike elementer.']));
  });

  it('serializes and parses ordering answers', () => {
    const value = serializeOrderingAnswer(['norway', 'germany', 'italy']);
    expect(parseOrderingAnswer(value)).toEqual(['norway', 'germany', 'italy']);
    expect(parseOrderingAnswer('not json')).toBeNull();
  });

  it('awards full points only for exact correct order', () => {
    expect(
      scoreOrderingAnswer('team1', 'q1', serializeOrderingAnswer(['norway', 'germany', 'italy']), question),
    ).toMatchObject({ points: 2, source: 'auto' });
    expect(
      scoreOrderingAnswer('team1', 'q1', serializeOrderingAnswer(['germany', 'norway', 'italy']), question),
    ).toMatchObject({ points: 0, source: 'auto' });
  });

  it('rejects malformed or incomplete submitted orders', () => {
    expect(scoreOrderingAnswer('team1', 'q1', '[]', question)).toMatchObject({ points: 0 });
    expect(
      scoreOrderingAnswer('team1', 'q1', serializeOrderingAnswer(['norway', 'germany', 'unknown']), question),
    ).toMatchObject({ points: 0 });
  });

  it('can shuffle displayed items before answering', () => {
    const shuffled = shuffleOrderingItems(question.orderingItems ?? [], () => 0);
    expect(shuffled).toHaveLength(3);
    expect(new Set(shuffled)).toEqual(new Set(['norway', 'germany', 'italy']));
  });
});
