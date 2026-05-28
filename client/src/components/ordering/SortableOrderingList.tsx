import type { ReactNode } from 'react';
import type { OrderingItem } from '@quiz-tool/shared';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableOrderingListProps {
  items: OrderingItem[];
  order: string[];
  onOrderChange: (order: string[]) => void;
  topLabel?: string;
  bottomLabel?: string;
  disabled?: boolean;
  getItemContent?: (item: OrderingItem, index: number) => ReactNode;
  getItemClassName?: (item: OrderingItem, index: number) => string;
  dragHandleLabel?: string;
}

function orderedItems(items: OrderingItem[], order: string[]): OrderingItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const sorted = order
    .map((id) => byId.get(id))
    .filter((item): item is OrderingItem => Boolean(item))
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  return [...sorted, ...items.filter((item) => !seen.has(item.id))];
}

function SortableOrderingCard({
  item,
  index,
  disabled,
  children,
  className,
  dragHandleLabel = 'Dra for å flytte',
}: {
  item: OrderingItem;
  index: number;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  dragHandleLabel?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex min-w-0 max-w-full items-stretch gap-1.5 rounded-2xl border p-1.5 shadow-sm transition-shadow sm:gap-2 sm:p-2 ${
        isDragging ? 'z-10 scale-[1.02] border-quiz-accent bg-quiz-accent/15 shadow-xl' : ''
      } ${className ?? 'border-quiz-border bg-quiz-surface-elevated/70'}`}
    >
      <button
        type="button"
        className="flex min-h-[3rem] w-9 shrink-0 touch-none select-none flex-col items-center justify-center rounded-lg border border-quiz-border bg-quiz-bg/80 px-0.5 text-quiz-muted active:scale-95 disabled:opacity-60 sm:min-h-[52px] sm:w-10"
        aria-label={`${dragHandleLabel}: ${item.text || `element ${index + 1}`}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <span className="text-xs font-black text-quiz-accent">{index + 1}</span>
        <span className="text-lg leading-none" aria-hidden>
          ↕
        </span>
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

export function SortableOrderingList({
  items,
  order,
  onOrderChange,
  topLabel = 'Øverst',
  bottomLabel = 'Nederst',
  disabled = false,
  getItemContent,
  getItemClassName,
  dragHandleLabel,
}: SortableOrderingListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const sortedItems = orderedItems(items, order);
  const ids = sortedItems.map((item) => item.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onOrderChange(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-quiz-border bg-gradient-to-b from-quiz-accent/10 via-quiz-bg to-quiz-surface p-2 sm:p-4">
      <div className="mb-2 flex min-w-0 items-center gap-2 text-xs font-bold text-quiz-accent">
        <span className="max-w-[min(100%,18rem)] shrink-0 rounded-full border border-quiz-accent/40 bg-quiz-accent/15 px-3 py-1 break-words [overflow-wrap:anywhere] leading-snug">
          {topLabel || 'Øverst'}
        </span>
        <span className="h-px min-w-4 flex-1 bg-quiz-accent/30" aria-hidden />
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {sortedItems.map((item, index) => (
              <SortableOrderingCard
                key={item.id}
                item={item}
                index={index}
                disabled={disabled}
                className={getItemClassName?.(item, index)}
                dragHandleLabel={dragHandleLabel}
              >
                {getItemContent ? (
                  getItemContent(item, index)
                ) : (
                  <div className="flex min-h-[52px] items-center rounded-xl bg-quiz-bg/50 px-3 py-2 text-base font-bold text-quiz-text">
                    <span className="break-words [overflow-wrap:anywhere]">{item.text}</span>
                  </div>
                )}
              </SortableOrderingCard>
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <div className="mt-2 flex min-w-0 items-center gap-2 text-xs font-bold text-quiz-muted">
        <span className="h-px min-w-4 flex-1 bg-quiz-border" aria-hidden />
        <span className="max-w-[min(100%,18rem)] shrink-0 rounded-full border border-quiz-border bg-quiz-bg/80 px-3 py-1 break-words [overflow-wrap:anywhere] leading-snug">
          {bottomLabel || 'Nederst'}
        </span>
      </div>
    </div>
  );
}
