import type { Protest } from '../types/room.js';

export function hasActiveProtest(
  protests: Pick<Protest, 'teamId' | 'questionId' | 'status'>[],
  teamId: string,
  questionId: string,
): boolean {
  return protests.some(
    (p) => p.teamId === teamId && p.questionId === questionId && p.status === 'pending',
  );
}
