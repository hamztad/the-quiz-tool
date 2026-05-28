import { describe, expect, it } from 'vitest';
import { NB } from '@quiz-tool/shared';
import {
  createRoom,
  endTestSession,
  prepareRoomForTestSession,
  startQuiz,
  startTestSession,
} from './roomService.js';

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
    expect(started.room.phase).toBe('live');
    expect(started.room.questionStatus.q1).toBe('open');
    expect(started.room.teams).toHaveLength(1);
    expect(started.room.teams[0]?.name).toBe(NB.testParticipantName);
    expect(started.room.teams[0]?.isTest).toBe(true);

    const ended = endTestSession(started.room);
    expect(ended.settings.testMode).toBe(false);
    expect(ended.teams).toHaveLength(0);
    expect(ended.phase).toBe('lobby');
    expect(ended.questionStatus.q1).toBe('locked');
  });

  it('opens every question when preparing test session', () => {
    let room = createRoom();
    room = {
      ...room,
      questions: [
        { id: 'q1', order: 0, type: 'open', lines: [{ text: 'A', style: 'title' }], maxPoints: 1 },
        { id: 'q2', order: 1, type: 'open', lines: [{ text: 'B', style: 'title' }], maxPoints: 1 },
      ],
      questionStatus: { q1: 'locked', q2: 'locked' },
      questionsActivated: {},
    };
    const prepared = prepareRoomForTestSession(room);
    expect(prepared.phase).toBe('live');
    expect(prepared.questionStatus.q1).toBe('open');
    expect(prepared.questionStatus.q2).toBe('open');
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
