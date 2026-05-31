import { describe, expect, it } from 'vitest';
import type { Question } from '@quiz-tool/shared';
import { submitOrUpdateAnswer } from './answerService.js';
import { upsertScore } from './gradingService.js';
import { createRoom, joinTeam, lockFinalResult, setQuestions, startQuiz } from './roomService.js';

const question: Question = {
  id: 'q1',
  order: 0,
  type: 'mc',
  lines: [{ text: 'Riktig?', style: 'title' }],
  options: [
    { id: 'yes', text: 'Ja', isCorrect: true },
    { id: 'no', text: 'Nei', isCorrect: false },
  ],
  maxPoints: 2,
};

function createScoredRoom() {
  let room = createRoom();
  room = setQuestions(room, [question]);
  const first = joinTeam(room, 'Team A');
  room = first.room;
  const second = joinTeam(room, 'Team B');
  room = second.room;
  room = {
    ...startQuiz(room),
    phase: 'post_quiz',
    settings: { ...room.settings, scoringMode: 'ranking' },
    scores: [
      { teamId: first.teamId, questionId: 'q1', points: 2, source: 'auto' },
      { teamId: second.teamId, questionId: 'q1', points: 1, source: 'auto' },
    ],
  };
  return { room, firstTeamId: first.teamId, secondTeamId: second.teamId };
}

describe('final result locking', () => {
  it('locks current leaderboard snapshot', () => {
    const { room, firstTeamId } = createScoredRoom();
    const locked = lockFinalResult(room, 1_000);

    expect(locked.settings.finalResultLocked).toBe(true);
    expect(locked.finalLeaderboardSnapshot?.lockedAt).toBe(1_000);
    expect(locked.finalLeaderboardSnapshot?.entries[0]).toMatchObject({
      teamId: firstTeamId,
      teamName: 'Team A',
      totalPoints: 2,
    });
  });

  it('keeps final snapshot when scores change after lock object is copied', () => {
    const { room, secondTeamId } = createScoredRoom();
    const locked = lockFinalResult(room, 1_000);
    const changed = {
      ...locked,
      scores: upsertScore(locked.scores, {
        teamId: secondTeamId,
        questionId: 'q2',
        points: 99,
        source: 'override',
      }),
    };

    expect(changed.finalLeaderboardSnapshot?.entries[0].teamName).toBe('Team A');
    expect(changed.finalLeaderboardSnapshot?.entries[0].totalPoints).toBe(2);
  });

  it('prevents answer changes after final result is locked', () => {
    const { room, firstTeamId } = createScoredRoom();
    const locked = {
      ...lockFinalResult(room, 1_000),
      phase: 'live' as const,
      questionStatus: { q1: 'open' as const },
    };

    expect(() => submitOrUpdateAnswer(locked, firstTeamId, 'q1', 'yes', false)).toThrow(
      /Endelig resultat er låst/,
    );
  });

  it('does not lock while protests are pending', () => {
    const { room, firstTeamId } = createScoredRoom();
    const withProtest = {
      ...room,
      protests: [
        {
          id: 'p1',
          teamId: firstTeamId,
          questionId: 'q1',
          status: 'pending' as const,
        },
      ],
    };

    expect(() => lockFinalResult(withProtest)).toThrow(/protester/);
  });
});
