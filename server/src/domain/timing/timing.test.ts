import { describe, expect, it } from 'vitest';
import { createRoom, startQuiz } from '../roomService.js';
import { openQuestion, lockQuestion } from '../questionService.js';
import { setQuizSchedule, applyScheduledQuizStart, applyScheduledQuizEnd } from './scheduleService.js';
import { applyDueDeadlines } from './applyTimerDeadline.js';
import type { Question } from '@quiz-tool/shared';

function sampleQuestion(): Question {
  return {
    id: 'q1',
    order: 0,
    type: 'open',
    lines: [{ text: 'Test', style: 'title' }],
    acceptedAnswers: ['a'],
    maxPoints: 1,
    timer: { mode: 'preset', preset: '10s' },
  };
}

describe('question timers', () => {
  it('arms timer on open and clears on lock', () => {
    let room = createRoom();
    room = {
      ...room,
      questions: [sampleQuestion()],
      questionStatus: {},
      questionsActivated: {},
    };
    room = startQuiz(room, 1_000);
    room = openQuestion(room, 'q1', { allowWhenTeamsLockedOut: true });
    expect(room.activeQuestionTimers.q1?.durationMs).toBe(10_000);
    expect(room.questionStatus.q1).toBe('open');

    room = lockQuestion(room, 'q1');
    expect(room.activeQuestionTimers.q1).toBeUndefined();
    expect(room.questionStatus.q1).toBe('locked');
  });

  it('auto-locks when deadline passed', () => {
    let room = createRoom();
    room = {
      ...room,
      questions: [sampleQuestion()],
      questionStatus: { q1: 'open' },
      questionsActivated: { q1: true },
      phase: 'live',
      activeQuestionTimers: {
        q1: {
          questionId: 'q1',
          openedAt: 0,
          endsAt: 500,
          generation: 1,
          durationMs: 500,
        },
      },
    };
    room = applyDueDeadlines(room, 600);
    expect(room.questionStatus.q1).toBe('locked');
    expect(room.activeQuestionTimers.q1).toBeUndefined();
  });
});

describe('quiz schedule', () => {
  it('arms schedule in lobby and starts at startsAt', () => {
    let room = createRoom();
    room = { ...room, questions: [sampleQuestion()] };
    const now = 10_000;
    room = setQuizSchedule(
      room,
      { startDelayMs: 5_000, durationMs: 60_000, runMode: 'assisted', autoOpenFirstQuestion: true },
      now,
    );
    expect(room.schedule?.startsAt).toBe(15_000);
    expect(room.phase).toBe('lobby');

    room = applyScheduledQuizStart(room, 14_999);
    expect(room.phase).toBe('lobby');

    room = applyScheduledQuizStart(room, 15_000);
    expect(room.phase).toBe('live');
    expect(room.questionStatus.q1).toBe('open');
  });

  it('arms schedule from absolute startsAt', () => {
    let room = createRoom();
    room = { ...room, questions: [sampleQuestion()] };
    const now = 10_000;
    const startsAt = now + 2 * 60 * 60_000;
    room = setQuizSchedule(
      room,
      { startsAt, durationMs: 30 * 60_000, runMode: 'manual' },
      now,
    );
    expect(room.schedule?.startsAt).toBe(startsAt);
    expect(room.schedule?.endsAt).toBe(startsAt + 30 * 60_000);
  });

  it('ends quiz at schedule end', () => {
    let room = createRoom();
    room = {
      ...room,
      questions: [sampleQuestion()],
      phase: 'live',
      questionStatus: { q1: 'open' },
      schedule: {
        enabled: true,
        startsAt: 0,
        endsAt: 1_000,
        runMode: 'assisted',
      },
      activeQuestionTimers: {},
    };
    room = applyScheduledQuizEnd(room, 1_000);
    expect(room.phase).toBe('post_quiz');
    expect(room.settings.teamsLockedOut).toBe(true);
    expect(room.schedule?.completedAt).toBe(1_000);
  });
});
