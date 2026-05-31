import { useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import type { OrderingItem } from '@quiz-tool/shared';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const label = `${dragHandleLabel}: ${item.text || `element ${index + 1}`}`;
  const rowDragClass = enableRowDrag
    ? `touch-none select-none min-w-0 flex-1 ${
        disabled ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'
      }`
    : '';

  if (enableRowDrag) {
    return (
      <li
        ref={setNodeRef}
        style={style}
        className={`flex min-w-0 max-w-full items-stretch gap-1 sm:gap-1.5 ${
          isDragging ? 'z-20' : ''
        }`}
      >
        <div
          className={`flex min-w-0 flex-1 items-stretch gap-2 rounded-2xl border-2 p-1.5 shadow-sm transition-[box-shadow,transform,border-color] sm:gap-2.5 sm:p-2 ${
            isDragging
              ? 'border-quiz-accent bg-quiz-accent/15 shadow-xl ring-2 ring-quiz-accent/25'
              : 'border-quiz-border bg-quiz-surface-elevated/90 active:border-quiz-accent/50'
          } ${className ?? ''} ${rowDragClass}`}
          aria-label={label}
          {...attributes}
          {...listeners}
        >
          <OrderingIndexBadge index={index} />
          <div className="ordering-sortable-content flex min-w-0 flex-1 items-center">{children}</div>
          <span className="shrink-0 self-center px-1 text-lg text-quiz-muted/80" aria-hidden>
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

  const handleDragClass = `touch-none select-none ${
    disabled ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'
  }`;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex min-w-0 max-w-full items-stretch gap-1 rounded-2xl border p-1 shadow-sm transition-shadow sm:gap-1.5 sm:p-1.5 ${
        isDragging ? 'z-10 border-quiz-accent bg-quiz-accent/15 shadow-xl opacity-90' : ''
      } ${className ?? 'border-quiz-border bg-quiz-surface-elevated/70'}`}
    >
      <div
        className={`flex shrink-0 flex-col items-stretch ${handleDragClass}`}
        aria-label={label}
        {...attributes}
        {...listeners}
      >
        <div className="flex min-h-[3rem] w-9 shrink-0 flex-col items-center justify-center rounded-lg border border-quiz-border bg-quiz-bg/80 px-0.5 text-quiz-muted sm:min-h-[52px] sm:w-10">
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

function OrderingCardPreview({
  index,
  children,
  className,
  fullCard,
}: {
  index: number;
  children: ReactNode;
  className?: string;
  fullCard?: boolean;
}) {
  if (fullCard) {
    return (
      <div
        className={`flex min-w-0 max-w-full items-stretch gap-2 rounded-2xl border-2 p-2 shadow-xl sm:gap-2.5 ${
          className ?? 'border-quiz-accent bg-quiz-accent/15'
        }`}
      >
        <OrderingIndexBadge index={index} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-0 max-w-full items-stretch gap-1.5 rounded-2xl border p-1.5 shadow-xl sm:gap-2 sm:p-2 ${
        className ?? 'border-quiz-accent bg-quiz-accent/15'
      }`}
    >
      <OrderingIndexBadge index={index} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 12 },
    }),
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const sortedItems = orderedItems(items, order);
  const ids = sortedItems.map((item) => item.id);
  const activeItem = activeId ? sortedItems.find((item) => item.id === activeId) : undefined;
  const activeIndex = activeItem ? sortedItems.indexOf(activeItem) : -1;

  const applyMove = (fromIndex: number, direction: -1 | 1) => {
    const next = moveOrderingIds(ids, fromIndex, direction);
    if (next) onOrderChange(next);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onOrderChange(arrayMove(ids, oldIndex, newIndex));
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-quiz-border bg-gradient-to-b from-quiz-accent/10 via-quiz-bg to-quiz-surface p-2 sm:p-4">
      <div className="mb-2 flex min-w-0 items-center gap-2 text-xs font-bold text-quiz-accent">
        <span className="max-w-[min(100%,18rem)] shrink-0 rounded-full border border-quiz-accent/40 bg-quiz-accent/15 px-3 py-1 break-words [overflow-wrap:anywhere] leading-snug">
          {topLabel || 'Øverst'}
        </span>
        <span className="h-px min-w-4 flex-1 bg-quiz-accent/30" aria-hidden />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="ordering-sortable-list space-y-2">
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
        <DragOverlay dropAnimation={null}>
          {activeItem && activeIndex >= 0 ? (
            <OrderingCardPreview
              index={activeIndex}
              fullCard={enableRowDrag}
              className={getItemClassName?.(activeItem, activeIndex)}
            >
              {getItemContent ? (
                getItemContent(activeItem, activeIndex)
              ) : (
                <div className="flex min-h-[52px] w-full items-center rounded-xl bg-quiz-bg/50 px-3 py-2 text-base font-bold text-quiz-text">
                  <span className="break-words [overflow-wrap:anywhere]">{activeItem.text}</span>
                </div>
              )}
            </OrderingCardPreview>
          ) : null}
        </DragOverlay>
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
            ? 'Trykk og hold på hele kortet for å dra, eller bruk ↑ ↓'
            : 'Dra ↕-feltet, eller bruk ↑ ↓ til høyre'}
        </p>
      )}
    </div>
  );
}
