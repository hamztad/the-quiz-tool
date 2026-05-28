import { describe, expect, it } from 'vitest';
import type { Question } from '../types/room.js';
import { assertLiveQuizQuestionUpdates } from './liveQuizEdit.js';

function openQuestion(id: string, title: string): Question {
  return {
    id,
    order: 0,
    type: 'open',
    lines: [{ text: title }],
    acceptedAnswers: ['a'],
    maxPoints: 1,
  };
}

describe('assertLiveQuizQuestionUpdates', () => {
  const baseRoom = {
    phase: 'live' as const,
    questions: [openQuestion('q1', 'Før'), openQuestion('q2', 'Neste')],
    questionStatus: { q1: 'open' as const, q2: 'locked' as const },
  };

  it('allows editing locked questions', () => {
    const next = [
      openQuestion('q1', 'Før'),
      { ...openQuestion('q2', 'Neste'), lines: [{ text: 'Rettet' }] },
    ];
    expect(() => assertLiveQuizQuestionUpdates(baseRoom, next)).not.toThrow();
  });

  it('rejects changing an open question', () => {
    const next = [
      { ...openQuestion('q1', 'Før'), lines: [{ text: 'Endret' }] },
      openQuestion('q2', 'Neste'),
    ];
    expect(() => assertLiveQuizQuestionUpdates(baseRoom, next)).toThrow(/Åpne spørsmål/);
  });

  it('rejects adding or removing questions', () => {
    expect(() =>
      assertLiveQuizQuestionUpdates(baseRoom, [openQuestion('q1', 'Før')]),
    ).toThrow(/lukkede spørsmål/);
  });

  it('skips checks in lobby', () => {
    expect(() =>
      assertLiveQuizQuestionUpdates(
        { ...baseRoom, phase: 'lobby' },
        [openQuestion('q9', 'Ny')],
      ),
    ).not.toThrow();
  });
});
