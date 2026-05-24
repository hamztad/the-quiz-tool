import { describe, expect, it } from 'vitest';
import {
  buildGradingAssignments,
  buildGradingAssignmentsFromOrder,
  canStartPeerGrading,
  validateGradingAssignments,
} from './buildGradingAssignments.js';

const OPEN = ['q-open-1'];

function teamIds(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `team-${i + 1}`);
}

describe('buildGradingAssignmentsFromOrder', () => {
  it('creates a cycle A -> B -> C -> A for three teams', () => {
    const assignments = buildGradingAssignmentsFromOrder(['A', 'B', 'C'], OPEN);
    expect(assignments).toEqual([
      { graderTeamId: 'A', targetTeamId: 'B', questionIds: OPEN },
      { graderTeamId: 'B', targetTeamId: 'C', questionIds: OPEN },
      { graderTeamId: 'C', targetTeamId: 'A', questionIds: OPEN },
    ]);
    expect(validateGradingAssignments(['A', 'B', 'C'], assignments)).toEqual({ valid: true });
  });

  it('creates a cycle for five teams in order', () => {
    const ordered = ['A', 'B', 'C', 'D', 'E'];
    const assignments = buildGradingAssignmentsFromOrder(ordered, OPEN);
    expect(assignments.map((a) => `${a.graderTeamId}->${a.targetTeamId}`)).toEqual([
      'A->B',
      'B->C',
      'C->D',
      'D->E',
      'E->A',
    ]);
    expect(validateGradingAssignments(ordered, assignments)).toEqual({ valid: true });
  });

  it('creates a two-team swap', () => {
    const assignments = buildGradingAssignmentsFromOrder(['A', 'B'], OPEN);
    expect(assignments).toEqual([
      { graderTeamId: 'A', targetTeamId: 'B', questionIds: OPEN },
      { graderTeamId: 'B', targetTeamId: 'A', questionIds: OPEN },
    ]);
    expect(validateGradingAssignments(['A', 'B'], assignments)).toEqual({ valid: true });
  });
});

describe('buildGradingAssignments', () => {
  it('returns empty for one team', () => {
    expect(buildGradingAssignments(['solo'], OPEN)).toEqual([]);
  });

  it('returns empty with no open questions', () => {
    expect(buildGradingAssignments(['A', 'B'], [])).toEqual([]);
  });

  it('validates for 3 teams with deterministic shuffle', () => {
    let call = 0;
    const random = () => {
      // Fisher–Yates on 3 elements: force order [A,B,C] with controlled random values
      const values = [0.1, 0.1];
      return values[call++] ?? 0.5;
    };
    const ids = teamIds(3);
    const assignments = buildGradingAssignments(ids, OPEN, random);
    expect(validateGradingAssignments(ids, assignments)).toEqual({ valid: true });
  });

  it('validates for 5 teams across many shuffles', () => {
    const ids = teamIds(5);
    for (let seed = 0; seed < 50; seed++) {
      let s = seed;
      const random = () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
      };
      const assignments = buildGradingAssignments(ids, OPEN, random);
      expect(validateGradingAssignments(ids, assignments)).toEqual({ valid: true });
    }
  });

  it('never assigns self-grading for 2–5 teams', () => {
    for (const n of [2, 3, 5]) {
      const ids = teamIds(n);
      const assignments = buildGradingAssignments(ids, OPEN);
      for (const a of assignments) {
        expect(a.graderTeamId).not.toBe(a.targetTeamId);
      }
    }
  });
});

describe('validateGradingAssignments', () => {
  it('rejects duplicate targets', () => {
    const bad = [
      { graderTeamId: 'A', targetTeamId: 'B', questionIds: OPEN },
      { graderTeamId: 'B', targetTeamId: 'B', questionIds: OPEN },
    ];
    const result = validateGradingAssignments(['A', 'B'], bad);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('duplicate target'))).toBe(true);
    }
  });

  it('rejects self-grading', () => {
    const bad = [
      { graderTeamId: 'A', targetTeamId: 'A', questionIds: OPEN },
      { graderTeamId: 'B', targetTeamId: 'B', questionIds: OPEN },
    ];
    const result = validateGradingAssignments(['A', 'B'], bad);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('self-grading'))).toBe(true);
    }
  });
});

describe('canStartPeerGrading', () => {
  it('disallows one team', () => {
    expect(canStartPeerGrading(1, 1)).toEqual({
      ok: false,
      message: 'Retterunde krever minst to lag. Med ett lag er peer-retting deaktivert.',
    });
  });

  it('allows two or more teams with open questions', () => {
    expect(canStartPeerGrading(2, 1)).toEqual({ ok: true });
    expect(canStartPeerGrading(5, 3)).toEqual({ ok: true });
  });
});
