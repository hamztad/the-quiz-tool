import type { McOption, Question } from '../types/room.js';
import { shuffleArray } from '../ai/shuffleMcOptions.js';

export function buildMcDisplayOptionOrder(
  options: McOption[],
  random: () => number = Math.random,
): string[] {
  return shuffleArray(options, random).map((option) => option.id);
}

export function orderMcOptionsByIds(options: McOption[], order: string[]): McOption[] {
  const byId = new Map(options.map((option) => [option.id, option]));
  const seen = new Set<string>();
  const sorted = order
    .map((id) => byId.get(id))
    .filter((option): option is McOption => Boolean(option))
    .filter((option) => {
      if (seen.has(option.id)) return false;
      seen.add(option.id);
      return true;
    });
  return [...sorted, ...options.filter((option) => !seen.has(option.id))];
}

/** Deltaker-visning: editor-rekkefølge, eller serverens rekkefølge for denne åpningen. */
export function getParticipantMcOptions(
  question: Pick<Question, 'id' | 'type' | 'options' | 'shuffleMcOptionsOnOpen'>,
  mcDisplayOptionOrder: Record<string, string[]> | undefined,
): McOption[] {
  const options = question.options ?? [];
  if (question.type !== 'mc' || !question.shuffleMcOptionsOnOpen) {
    return options;
  }
  const order = mcDisplayOptionOrder?.[question.id];
  if (!order?.length) return options;
  return orderMcOptionsByIds(options, order);
}

export function moveMcOptionIds(
  ids: string[],
  fromIndex: number,
  direction: -1 | 1,
): string[] | null {
  const toIndex = fromIndex + direction;
  if (toIndex < 0 || toIndex >= ids.length) return null;
  const next = [...ids];
  const [removed] = next.splice(fromIndex, 1);
  if (!removed) return null;
  next.splice(toIndex, 0, removed);
  return next;
}
