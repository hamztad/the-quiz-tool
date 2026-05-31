import type { CSSProperties, ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import type { OrderingItem } from '@quiz-tool/shared';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { moveOrderingIds } from './orderingListOrder';

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
  /** Hele kortet er draggable (deltaker). False når raden har input (QM-editor). */
  enableRowDrag?: boolean;
  showReorderButtons?: boolean;
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

function stopDragPointer(event: ReactPointerEvent) {
  event.stopPropagation();
}

function sortableStyle(
  transform: ReturnType<typeof useSortable>['transform'],
  transition: string | undefined,
  isDragging: boolean,
): CSSProperties {
  return {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative',
  };
}

function OrderingIndexBadge({ index }: { index: number }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-quiz-accent/35 bg-quiz-accent/15 text-sm font-black text-quiz-accent sm:h-11 sm:w-11"
      aria-hidden
    >
      {index + 1}
    </span>
  );
}

function ReorderButtons({
  item,
  index,
  itemCount,
  disabled,
  onMoveUp,
  onMoveDown,
}: {
  item: OrderingItem;
  index: number;
  itemCount: number;
  disabled?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const canMoveUp = index > 0 && !disabled;
  const canMoveDown = index < itemCount - 1 && !disabled;
  const label = item.text || `element ${index + 1}`;

  return (
    <div
      className="flex shrink-0 flex-col justify-center gap-0.5 self-stretch py-0.5"
      onPointerDown={stopDragPointer}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-xl border-2 border-quiz-border bg-quiz-bg text-lg font-black text-quiz-accent transition-colors hover:border-quiz-accent/60 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-[44px] sm:min-w-[44px]"
        disabled={!canMoveUp}
        aria-label={`Flytt «${label}» opp`}
        onClick={onMoveUp}
      >
        ↑
      </button>
      <button
        type="button"
        className="flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-xl border-2 border-quiz-border bg-quiz-bg text-lg font-black text-quiz-accent transition-colors hover:border-quiz-accent/60 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-[44px] sm:min-w-[44px]"
        disabled={!canMoveDown}
        aria-label={`Flytt «${label}» ned`}
        onClick={onMoveDown}
      >
        ↓
      </button>
    </div>
  );
}

function SortableOrderingCard({
  item,
  index,
  itemCount,
  disabled,
  children,
  className,
  dragHandleLabel = 'Dra for å flytte',
  enableRowDrag,
  showReorderButtons,
  onMoveUp,
  onMoveDown,
}: {
  item: OrderingItem;
  index: number;
  itemCount: number;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  dragHandleLabel?: string;
  enableRowDrag: boolean;
  showReorderButtons: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });
  const style = sortableStyle(transform, transition, isDragging);
  const label = `${dragHandleLabel}: ${item.text || `element ${index + 1}`}`;

  if (enableRowDrag) {
    return (
      <li className="flex min-w-0 max-w-full list-none items-stretch gap-1 sm:gap-1.5">
        <div
          ref={setNodeRef}
          style={style}
          className={`ordering-sortable-card flex min-w-0 flex-1 touch-none select-none items-stretch gap-2 rounded-2xl border-2 p-1.5 shadow-sm sm:gap-2.5 sm:p-2 ${
            disabled ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'
          } ${
            isDragging
              ? 'border-quiz-accent bg-quiz-surface-elevated shadow-2xl ring-2 ring-quiz-accent/30 scale-[1.02]'
              : 'border-quiz-border bg-quiz-surface-elevated/90'
          } ${className ?? ''}`}
          aria-label={label}
          {...attributes}
          {...listeners}
        >
          <OrderingIndexBadge index={index} />
          <div className="ordering-sortable-content flex min-w-0 flex-1 items-center">{children}</div>
          <span className="shrink-0 self-center px-1 text-lg text-quiz-muted/70" aria-hidden>
            ↕
          </span>
        </div>
        {showReorderButtons && (
          <ReorderButtons
            item={item}
            index={index}
            itemCount={itemCount}
            disabled={disabled}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        )}
      </li>
    );
  }

  return (
    <li className="flex min-w-0 max-w-full list-none items-stretch gap-1 rounded-2xl border p-1 shadow-sm sm:gap-1.5 sm:p-1.5 border-quiz-border bg-quiz-surface-elevated/70">
      <div
        ref={setNodeRef}
        style={style}
        className={`ordering-sortable-card flex shrink-0 touch-none select-none ${
          disabled ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'
        } ${isDragging ? 'opacity-90' : ''}`}
        aria-label={label}
        {...attributes}
        {...listeners}
      >
        <div className="flex min-h-[3rem] w-9 flex-col items-center justify-center rounded-lg border border-quiz-border bg-quiz-bg/80 px-0.5 text-quiz-muted sm:min-h-[52px] sm:w-10">
          <span className="text-xs font-black text-quiz-accent">{index + 1}</span>
          <span className="text-base leading-none sm:text-lg">↕</span>
        </div>
      </div>
      <div className="ordering-sortable-content min-w-0 flex-1">{children}</div>
      {showReorderButtons && (
        <ReorderButtons
          item={item}
          index={index}
          itemCount={itemCount}
          disabled={disabled}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      )}
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
  enableRowDrag = true,
  showReorderButtons = true,
}: SortableOrderingListProps) {
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 12 },
    }),
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const sortedItems = orderedItems(items, order);
  const ids = sortedItems.map((item) => item.id);

  const applyMove = (fromIndex: number, direction: -1 | 1) => {
    const next = moveOrderingIds(ids, fromIndex, direction);
    if (next) onOrderChange(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onOrderChange(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden rounded-3xl border border-quiz-border bg-gradient-to-b from-quiz-accent/10 via-quiz-bg to-quiz-surface p-2 sm:p-4">
      <div className="mb-2 flex min-w-0 items-center gap-2 text-xs font-bold text-quiz-accent">
        <span className="max-w-[min(100%,18rem)] shrink-0 rounded-full border border-quiz-accent/40 bg-quiz-accent/15 px-3 py-1 break-words [overflow-wrap:anywhere] leading-snug">
          {topLabel || 'Øverst'}
        </span>
        <span className="h-px min-w-4 flex-1 bg-quiz-accent/30" aria-hidden />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        autoScroll={{ threshold: { x: 0, y: 0.12 }, acceleration: 12 }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="ordering-sortable-list m-0 space-y-2 p-0">
            {sortedItems.map((item, index) => (
              <SortableOrderingCard
                key={item.id}
                item={item}
                index={index}
                itemCount={sortedItems.length}
                disabled={disabled}
                className={getItemClassName?.(item, index)}
                dragHandleLabel={dragHandleLabel}
                enableRowDrag={enableRowDrag}
                showReorderButtons={showReorderButtons}
                onMoveUp={() => applyMove(index, -1)}
                onMoveDown={() => applyMove(index, 1)}
              >
                {getItemContent ? (
                  getItemContent(item, index)
                ) : (
                  <div className="flex min-h-[52px] w-full items-center rounded-xl bg-quiz-bg/50 px-3 py-2 text-base font-bold text-quiz-text">
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
      {showReorderButtons && !disabled && (
        <p className="mt-2 text-center text-[11px] text-quiz-muted leading-snug">
          {enableRowDrag
            ? 'Hold på hele kortet og dra, eller bruk ↑ ↓'
            : 'Dra ↕-feltet, eller bruk ↑ ↓ til høyre'}
        </p>
      )}
    </div>
  );
}
