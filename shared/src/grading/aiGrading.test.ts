import { describe, expect, it } from 'vitest';
import {
  canStartAiGrading,
  collectOpenAnswerGradeJobs,
  mergeAiGradesToScores,
  upsertAiGrade,
} from './aiGrading.js';
import type { Question, RoomState } from '../types/room.js';

function openQuestion(id: string): Question {
  return {
    id,
    order: 0,
    type: 'open',
    lines: [{ text: 'Hva er hovedstaden i Norge?', style: 'title' }],
    acceptedAnswers: ['Oslo'],
    maxPoints: 2,
  };
}

describe('aiGrading', () => {
  it('collects jobs for open answers only', () => {
    const questions = [openQuestion('q1')];
    const jobs = collectOpenAnswerGradeJobs(questions, [
      { teamId: 't1', questionId: 'q1', value: 'Oslo', updatedAt: 1 },
      { teamId: 't2', questionId: 'q1', value: '  ', updatedAt: 1 },
    ]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.answer).toBe('Oslo');
  });

  it('merges ai grades into scores', () => {
    const room = {
      scores: [{ teamId: 't1', questionId: 'q1', points: 1, source: 'auto' as const }],
      aiGrades: [
        {
          teamId: 't1',
          questionId: 'q2',
          points: 2,
          reasoning: 'Riktig',
          submittedAt: 1,
        },
      ],
    } as RoomState;
    const merged = mergeAiGradesToScores(room);
    expect(merged).toContainEqual({
      teamId: 't1',
      questionId: 'q2',
      points: 2,
      source: 'ai',
    });
  });

  it('blocks start when already running', () => {
    const result = canStartAiGrading(2, 3, { status: 'running', completed: 1, total: 3 });
    expect(result.ok).toBe(false);
  });

  it('upserts ai grade per team and question', () => {
    const room = { aiGrades: [], scores: [] } as RoomState;
    const next = upsertAiGrade(room, {
      teamId: 't1',
      questionId: 'q1',
      points: 1,
      reasoning: 'Delvis',
      submittedAt: 1,
    });
    const again = upsertAiGrade(next, {
      teamId: 't1',
      questionId: 'q1',
      points: 2,
      reasoning: 'Heilt riktig',
      submittedAt: 2,
    });
    expect(again.aiGrades).toHaveLength(1);
    expect(again.aiGrades[0]?.points).toBe(2);
  });
});
