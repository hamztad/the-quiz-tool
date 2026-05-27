import { describe, expect, it } from 'vitest';
import { NB } from '@quiz-tool/shared';
import { createRoom, endTestSession, startQuiz, startTestSession } from './roomService.js';

describe('test session', () => {
  it('creates a test participant and clears on end', () => {
    let room = createRoom();
    room = {
      ...room,
      questions: [
        {
          id: 'q1',
          order: 0,
          type: 'mc',
          lines: [{ text: 'Test?', style: 'title' }],
          options: [
            { id: 'a', text: 'A', isCorrect: true },
            { id: 'b', text: 'B', isCorrect: false },
          ],
          maxPoints: 1,
        },
      ],
      questionStatus: { q1: 'locked' },
      questionsActivated: { q1: false },
    };

    const started = startTestSession(room);
    expect(started.room.settings.testMode).toBe(true);
    expect(started.room.teams).toHaveLength(1);
    expect(started.room.teams[0]?.name).toBe(NB.testParticipantName);
    expect(started.room.teams[0]?.isTest).toBe(true);

    const ended = endTestSession(started.room);
    expect(ended.settings.testMode).toBe(false);
    expect(ended.teams).toHaveLength(0);
  });

  it('removes test participant when starting the real quiz', () => {
    let room = createRoom();
    room = {
      ...room,
      questions: [
        {
          id: 'q1',
          order: 0,
          type: 'open',
          lines: [{ text: 'Q', style: 'title' }],
          maxPoints: 1,
        },
      ],
      questionStatus: { q1: 'locked' },
      questionsActivated: { q1: false },
    };

    const { room: withTest } = startTestSession(room);
    const live = startQuiz(withTest);
    expect(live.settings.testMode).toBe(false);
    expect(live.teams).toHaveLength(0);
    expect(live.phase).toBe('live');
  });
});
