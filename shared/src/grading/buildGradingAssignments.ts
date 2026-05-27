import type { GradingAssignment, Question } from '../types/room.js';

export function getOpenQuestionIds(questions: Question[]): string[] {
  return questions.filter((q) => q.type === 'open').map((q) => q.id);
}

/** Fisher–Yates shuffle (copy). Injectable `random` for tests. */
export function shuffleTeamIds(teamIds: string[], random: () => number = Math.random): string[] {
  const shuffled = [...teamIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * One-to-one peer grading cycle: each grader at index i grades team at (i + 1) % N.
 * `orderedTeamIds` must already be shuffled (or any order) — no self-grading in a cycle of length >= 2.
 */
export function buildGradingAssignmentsFromOrder(
  orderedTeamIds: string[],
  openQuestionIds: string[],
): GradingAssignment[] {
  if (openQuestionIds.length === 0 || orderedTeamIds.length < 2) {
    return [];
  }

  const n = orderedTeamIds.length;
  return orderedTeamIds.map((graderTeamId, i) => ({
    graderTeamId,
    targetTeamId: orderedTeamIds[(i + 1) % n]!,
    questionIds: [...openQuestionIds],
  }));
}

/** Shuffle teams once, then assign each grader to the next team in the cycle. */
export function buildGradingAssignments(
  teamIds: string[],
  openQuestionIds: string[],
  random: () => number = Math.random,
): GradingAssignment[] {
  if (openQuestionIds.length === 0 || teamIds.length < 2) {
    return [];
  }
  return buildGradingAssignmentsFromOrder(shuffleTeamIds(teamIds, random), openQuestionIds);
}

export type PeerGradingValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

/** Verifies a perfect matching: one grader and one target per team, no self-grading. */
export function validateGradingAssignments(
  teamIds: string[],
  assignments: GradingAssignment[],
): PeerGradingValidationResult {
  const errors: string[] = [];
  const n = teamIds.length;

  if (assignments.length !== n) {
    errors.push(`expected ${n} assignments, got ${assignments.length}`);
  }

  const graders = assignments.map((a) => a.graderTeamId);
  const targets = assignments.map((a) => a.targetTeamId);

  for (const id of teamIds) {
    if (graders.filter((g) => g === id).length !== 1) {
      errors.push(`grader count for ${id} is not 1`);
    }
    if (targets.filter((t) => t === id).length !== 1) {
      errors.push(`target count for ${id} is not 1`);
    }
  }

  for (const a of assignments) {
    if (a.graderTeamId === a.targetTeamId) {
      errors.push(`self-grading: ${a.graderTeamId}`);
    }
    if (!teamIds.includes(a.graderTeamId)) {
      errors.push(`unknown grader: ${a.graderTeamId}`);
    }
    if (!teamIds.includes(a.targetTeamId)) {
      errors.push(`unknown target: ${a.targetTeamId}`);
    }
  }

  const uniqueTargets = new Set(targets);
  if (uniqueTargets.size !== targets.length) {
    errors.push('duplicate target teams');
  }

  const uniqueGraders = new Set(graders);
  if (uniqueGraders.size !== graders.length) {
    errors.push('duplicate grader teams');
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

export type CanStartPeerGradingResult =
  | { ok: true }
  | { ok: false; message: string };

export function canStartPeerGrading(
  teamCount: number,
  openQuestionCount: number,
): CanStartPeerGradingResult {
  if (teamCount < 2) {
    return {
      ok: false,
      message:
        'Retterunde krever minst to deltakere. Med én deltaker er peer-retting deaktivert.',
    };
  }
  if (openQuestionCount === 0) {
    return {
      ok: false,
      message: 'Retterunde krever minst ett åpent spørsmål i quizen.',
    };
  }
  return { ok: true };
}
