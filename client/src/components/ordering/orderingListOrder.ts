import { arrayMove } from '@dnd-kit/sortable';

export function moveOrderingIds(
  ids: string[],
  fromIndex: number,
  direction: -1 | 1,
): string[] | null {
  const toIndex = fromIndex + direction;
  if (toIndex < 0 || toIndex >= ids.length) return null;
  return arrayMove(ids, fromIndex, toIndex);
}
