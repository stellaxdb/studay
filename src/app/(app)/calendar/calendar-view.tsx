"use client";

import { CalendarPlus, CheckSquare, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import { TodoFormDialog } from "@/components/todo/todo-form-dialog";
import { TodoRow } from "@/components/todo/todo-row";
import { ColorDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useCategories, useEvents, useSettings, useSubjects, useTodos } from "@/lib/data/queries";
import { EVENT_TYPE_MAP, eventDays } from "@/lib/events";
import { useTimeZone, useToday } from "@/lib/hooks";
import {
  addDaysToKey,
  addMonthsToKey,
  formatDayLabel,
  formatTime,
  monthGrid,
  parseDayKey,
  startOfDayKey,
  weekdayLabel,
  weekdayOfKey,
} from "@/lib/time";
import { sortTodos } from "@/lib/todos";
import type { CalendarEvent, Todo } from "@/lib/types";

const MAX_ITEMS_IN_CELL = 3;

type CellItem =
  | { kind: "todo"; todo: Todo; color: string }
  | { kind: "event"; event: CalendarEvent; color: string };

export function CalendarView() {
  const timeZone = useTimeZone();
  const today = useToday();
  const { data: settings } = useSettings();
  const weekStartsOn = settings?.week_starts_on ?? 1;

  const [month, setMonth] = useState(() => `${today.slice(0, 7)}-01`);
  const [selected, setSelected] = useState(today);
  const [eventDialog, setEventDialog] = useState<{ open: boolean; event: CalendarEvent | null }>({
    open: false,
    event: null,
  });
  const [todoDialog, setTodoDialog] = useState<{ open: boolean; todo: Todo | null }>({
    open: false,
    todo: null,
  });

  const grid = useMemo(() => monthGrid(month, weekStartsOn), [month, weekStartsOn]);
  const from = startOfDayKey(grid[0], timeZone).toISOString();
  const to = startOfDayKey(addDaysToKey(grid[grid.length - 1], 1), timeZone).toISOString();

  const eventsQuery = useEvents(from, to);
  const todosQuery = useTodos();
  const subjectsQuery = useSubjects();
  const { data: categories } = useCategories();

  const subjectMap = useMemo(
    () => new Map((subjectsQuery.data ?? []).map((s) => [s.id, s])),
    [subjectsQuery.data],
  );
  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  // Build day -> items. TODO deadlines are derived from todos.due_date (never copied).
  const itemsByDay = useMemo(() => {
    const map = new Map<string, CellItem[]>();
    const push = (key: string, item: CellItem) => map.set(key, [...(map.get(key) ?? []), item]);
    for (const todo of sortTodos(todosQuery.data ?? [])) {
      const subject = subjectMap.get(todo.subject_id);
      if (!todo.due_date || !subject || subject.is_archived) continue;
      push(todo.due_date, { kind: "todo", todo, color: subject.color });
    }
    for (const event of eventsQuery.data ?? []) {
      const color = (event.subject_id && subjectMap.get(event.subject_id)?.color) || "#64748B";
      for (const key of eventDays(event, timeZone)) push(key, { kind: "event", event, color });
    }
    return map;
  }, [todosQuery.data, eventsQuery.data, subjectMap, timeZone]);

  const { year, month: monthNum } = parseDayKey(month);
  const selectedItems = itemsByDay.get(selected) ?? [];
  const selectedTodos = selectedItems.flatMap((i) => (i.kind === "todo" ? [i.todo] : []));
  const selectedEvents = selectedItems
    .flatMap((i) => (i.kind === "event" ? [i.event] : []))
    .sort(
      (a, b) => Number(b.all_day) - Number(a.all_day) || a.starts_at.localeCompare(b.starts_at),
    );

  function goto(delta: number) {
    const next = addMonthsToKey(month, delta);
    setMonth(next);
    setSelected(next.slice(0, 7) === today.slice(0, 7) ? today : next);
  }

  const loading = eventsQuery.isLoading || todosQuery.isLoading || subjectsQuery.isLoading;
  const error = eventsQuery.error || todosQuery.error || subjectsQuery.error;

  return (
    <>
      <PageHeader
        title="캘린더"
        description="할 일 마감일과 시험·수업 같은 일정을 함께 확인해요."
        actions={
          <Button onClick={() => setEventDialog({ open: true, event: null })}>
            <CalendarPlus aria-hidden className="size-4" />
            일정 추가
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold" aria-live="polite">
              {year}년 {monthNum}월
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMonth(`${today.slice(0, 7)}-01`);
                  setSelected(today);
                }}
              >
                오늘
              </Button>
              <Button
                variant="tertiary"
                size="icon-sm"
                aria-label="이전 달"
                onClick={() => goto(-1)}
              >
                <ChevronLeft aria-hidden className="size-5" />
              </Button>
              <Button
                variant="tertiary"
                size="icon-sm"
                aria-label="다음 달"
                onClick={() => goto(1)}
              >
                <ChevronRight aria-hidden className="size-5" />
              </Button>
            </div>
          </div>

          {error ? (
            <ErrorState
              onRetry={() => {
                void eventsQuery.mutate();
                void todosQuery.mutate();
                void subjectsQuery.mutate();
              }}
            />
          ) : (
            <div className="relative">
              {loading && (
                <div className="bg-surface/70 absolute inset-0 z-10 flex items-center justify-center">
                  <LoadingState />
                </div>
              )}
              <div className="border-border grid grid-cols-7 border-b pb-2" aria-hidden>
                {grid.slice(0, 7).map((key) => {
                  const wd = weekdayOfKey(key);
                  return (
                    <span
                      key={key}
                      className={cn(
                        "text-center text-xs font-medium",
                        wd === 0 ? "text-danger" : "text-fg-secondary",
                      )}
                    >
                      {weekdayLabel(wd)}
                    </span>
                  );
                })}
              </div>
              <div className="grid grid-cols-7">
                {grid.map((key) => {
                  const items = itemsByDay.get(key) ?? [];
                  const inMonth = key.slice(0, 7) === month.slice(0, 7);
                  const isToday = key === today;
                  const isSelected = key === selected;
                  const todoCount = items.filter((i) => i.kind === "todo").length;
                  const eventCount = items.length - todoCount;
                  const label = [
                    formatDayLabel(key),
                    isToday ? "오늘" : null,
                    todoCount ? `마감 할 일 ${todoCount}개` : null,
                    eventCount ? `일정 ${eventCount}개` : null,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={label}
                      aria-pressed={isSelected}
                      onClick={() => setSelected(key)}
                      className={cn(
                        "border-border flex min-h-14 min-w-0 flex-col items-stretch gap-1 border-b p-1 text-left transition-colors duration-150 sm:min-h-24 sm:p-1.5",
                        isSelected ? "bg-primary-subtle" : "hover:bg-surface-subtle",
                      )}
                    >
                      <span
                        className={cn(
                          "tabular flex size-6 items-center justify-center self-center rounded-full text-xs font-medium sm:self-start",
                          isToday && "bg-primary font-semibold text-white",
                          !isToday && !inMonth && "text-fg-tertiary/60",
                          !isToday && inMonth && "text-fg",
                        )}
                      >
                        {parseDayKey(key).day}
                      </span>
                      {/* Mobile: dots only */}
                      {items.length > 0 && (
                        <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                          {items.slice(0, 4).map((item, i) => (
                            <ColorDot key={i} color={item.color} className="size-1.5" />
                          ))}
                        </span>
                      )}
                      {/* Desktop: short labels with type icon */}
                      <span className="hidden flex-col gap-0.5 sm:flex">
                        {items.slice(0, MAX_ITEMS_IN_CELL).map((item) => {
                          const done = item.kind === "todo" && item.todo.status === "done";
                          const Icon =
                            item.kind === "todo"
                              ? CheckSquare
                              : (EVENT_TYPE_MAP.get(item.event.event_type)?.icon ?? CheckSquare);
                          return (
                            <span
                              key={
                                item.kind === "todo" ? `t-${item.todo.id}` : `e-${item.event.id}`
                              }
                              className={cn(
                                "flex min-w-0 items-center gap-1 rounded px-1 text-[11px] leading-5",
                                inMonth ? "text-fg" : "text-fg-tertiary",
                                done && "text-fg-tertiary line-through",
                              )}
                            >
                              <span
                                aria-hidden
                                className="h-3 w-0.5 shrink-0 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <Icon aria-hidden className="text-fg-secondary size-3 shrink-0" />
                              <span className="truncate">
                                {item.kind === "todo" ? item.todo.title : item.event.title}
                              </span>
                            </span>
                          );
                        })}
                        {items.length > MAX_ITEMS_IN_CELL && (
                          <span className="text-fg-secondary px-1 text-[11px]">
                            +{items.length - MAX_ITEMS_IN_CELL}개
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-fg-secondary mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1">
                  <CheckSquare aria-hidden className="size-3.5" />할 일 마감
                </span>
                {[...EVENT_TYPE_MAP.values()].map((t) => (
                  <span key={t.value} className="inline-flex items-center gap-1">
                    <t.icon aria-hidden className="size-3.5" />
                    {t.label}
                  </span>
                ))}
              </p>
            </div>
          )}
        </Card>

        {/* Selected day */}
        <Card className="self-start">
          <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-2">
            <h2 className="text-base font-semibold">
              {formatDayLabel(selected)}
              {selected === today && <span className="text-primary ml-1.5 text-sm">오늘</span>}
            </h2>
          </div>

          <section aria-labelledby="day-events" className="px-5 py-2">
            <div className="flex items-center justify-between">
              <h3 id="day-events" className="text-fg-secondary text-sm font-medium">
                일정 {selectedEvents.length}
              </h3>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setEventDialog({ open: true, event: null })}
              >
                <Plus aria-hidden className="size-4" />
                추가
              </Button>
            </div>
            {selectedEvents.length === 0 ? (
              <p className="text-fg-tertiary py-2 text-sm">등록한 일정이 없어요.</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {selectedEvents.map((ev) => {
                  const type = EVENT_TYPE_MAP.get(ev.event_type);
                  const subject = ev.subject_id ? subjectMap.get(ev.subject_id) : undefined;
                  const Icon = type?.icon ?? CheckSquare;
                  return (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => setEventDialog({ open: true, event: ev })}
                        className="hover:bg-surface-subtle flex w-full items-start gap-3 rounded-[var(--radius-control)] px-2 py-2 text-left"
                      >
                        <span className="bg-surface-subtle text-fg-secondary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg">
                          <Icon aria-hidden className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium break-words">{ev.title}</span>
                          <span className="text-fg-secondary mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                            <span>{type?.label}</span>
                            <span className="tabular">
                              {ev.all_day
                                ? "하루 종일"
                                : `${formatTime(ev.starts_at, timeZone)}${ev.ends_at ? ` – ${formatTime(ev.ends_at, timeZone)}` : ""}`}
                            </span>
                            {subject && (
                              <span className="inline-flex items-center gap-1">
                                <ColorDot color={subject.color} />
                                {subject.name}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="day-todos" className="border-border border-t px-5 pt-3 pb-4">
            <div className="flex items-center justify-between">
              <h3 id="day-todos" className="text-fg-secondary text-sm font-medium">
                마감 할 일 {selectedTodos.length}
              </h3>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setTodoDialog({ open: true, todo: null })}
              >
                <Plus aria-hidden className="size-4" />
                추가
              </Button>
            </div>
            {selectedTodos.length === 0 ? (
              <p className="text-fg-tertiary py-2 text-sm">이 날 마감인 할 일이 없어요.</p>
            ) : (
              <ul className="divide-border divide-y">
                {selectedTodos.map((t) => (
                  <TodoRow
                    key={t.id}
                    todo={t}
                    today={today}
                    compact
                    subject={subjectMap.get(t.subject_id)}
                    category={t.category_id ? categoryMap.get(t.category_id) : undefined}
                    onOpen={(todo) => setTodoDialog({ open: true, todo })}
                  />
                ))}
              </ul>
            )}
          </section>
        </Card>
      </div>

      <EventFormDialog
        open={eventDialog.open}
        event={eventDialog.event}
        defaultDate={selected}
        timeZone={timeZone}
        onClose={() => setEventDialog({ open: false, event: null })}
      />
      <TodoFormDialog
        open={todoDialog.open}
        todo={todoDialog.todo}
        defaults={{ dueDate: selected }}
        onClose={() => setTodoDialog({ open: false, todo: null })}
      />
    </>
  );
}
