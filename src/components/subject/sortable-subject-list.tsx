"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ColorDot } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { moveItem } from "@/lib/order";
import type { Subject } from "@/lib/types";

interface Props {
  subjects: Subject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Second line under the name, e.g. "할 일 1/4 · 이번 주 1시간" */
  meta: (subject: Subject) => string;
  /** Called with the visible subject ids in their new order. */
  onReorder: (ids: string[]) => void;
  /** Disables dragging (e.g. while a previous order is being saved). */
  disabled?: boolean;
}

/**
 * Subject list whose order can be changed by dragging the handle, or with
 * the keyboard: focus the handle, Space to lift, ↑/↓ to move, Space to drop.
 */
export function SortableSubjectList({
  subjects,
  selectedId,
  onSelect,
  meta,
  onReorder,
  disabled,
}: Props) {
  const sensors = useSensors(
    // A small distance keeps a simple click on the handle from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = subjects.map((s) => s.id);
  const nameOf = (id: string | number) => subjects.find((s) => s.id === id)?.name ?? "과목";
  const positionOf = (id: string | number) => ids.indexOf(String(id)) + 1;

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `${nameOf(active.id)}을(를) 들었어요. 현재 ${positionOf(active.id)}번째예요.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nameOf(active.id)}을(를) ${positionOf(over.id)}번째 위치로 옮기는 중이에요.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf(active.id)}을(를) ${positionOf(over.id)}번째에 놓았어요.`
        : `${nameOf(active.id)}을(를) 제자리에 놓았어요.`,
    onDragCancel: ({ active }) => `${nameOf(active.id)} 이동을 취소했어요.`,
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(moveItem(ids, from, to));
  }

  return (
    <DndContext
      id="subject-order"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "순서를 바꾸려면 스페이스바를 눌러 들고, 위아래 방향키로 옮긴 뒤 스페이스바로 놓으세요. 취소하려면 Esc를 누르세요.",
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-0.5 p-2">
          {subjects.map((s) => (
            <SortableSubject
              key={s.id}
              subject={s}
              selected={s.id === selectedId}
              meta={meta(s)}
              onSelect={() => onSelect(s.id)}
              sortable={subjects.length > 1 && !disabled}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableSubject({
  subject,
  selected,
  meta,
  onSelect,
  sortable,
}: {
  subject: Subject;
  selected: boolean;
  meta: string;
  onSelect: () => void;
  sortable: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.id, disabled: !sortable });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative flex items-center rounded-[var(--radius-control)] transition-colors duration-150",
        selected ? "bg-primary-subtle" : "hover:bg-surface-subtle",
        isDragging && "bg-surface z-10 shadow-[0_6px_20px_rgb(25_31_40/0.12)]",
      )}
    >
      {sortable && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`${subject.name} 순서 바꾸기`}
          className={cn(
            "text-fg-tertiary hover:text-fg-secondary ml-1 flex h-10 w-6 shrink-0 touch-none items-center justify-center rounded-md",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
      )}
      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 text-left",
          sortable ? "pl-1" : "pl-3",
        )}
      >
        <ColorDot color={subject.color} className="size-2.5" />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-sm font-medium",
              selected ? "text-primary" : "text-fg",
            )}
          >
            {subject.name}
          </span>
          <span className="tabular text-fg-secondary block text-xs">{meta}</span>
        </span>
      </button>
    </li>
  );
}
