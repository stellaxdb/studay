"use client";

import { ChevronDown, ListChecks, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TodoFormDialog } from "@/components/todo/todo-form-dialog";
import { SubjectTodoSections } from "@/components/todo/subject-todo-sections";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useCategories, useSubjects, useTodos } from "@/lib/data/queries";
import { useToday } from "@/lib/hooks";
import { filterTodos, sortTodos, TODO_FILTER_LABELS, type TodoFilter } from "@/lib/todos";
import type { Todo } from "@/lib/types";

const FILTERS: TodoFilter[] = ["all", "today", "open", "due-soon", "overdue", "done"];

const EMPTY_COPY: Record<TodoFilter, string> = {
  all: "아직 등록한 할 일이 없어요.",
  today: "오늘 마감인 할 일이 없어요.",
  open: "남은 할 일이 없어요.",
  done: "완료한 할 일이 아직 없어요.",
  "due-soon": "3일 안에 마감되는 할 일이 없어요.",
  overdue: "기한이 지난 할 일이 없어요.",
};

export function TodosView() {
  const today = useToday();
  const todosQuery = useTodos();
  const subjectsQuery = useSubjects();
  const { data: categories } = useCategories();

  const [filter, setFilter] = useState<TodoFilter>("all");
  const [subjectId, setSubjectId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [showDone, setShowDone] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; todo: Todo | null }>({
    open: false,
    todo: null,
  });

  const subjects = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data]);
  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );
  const archivedIds = useMemo(
    () => new Set(subjects.filter((s) => s.is_archived).map((s) => s.id)),
    [subjects],
  );

  const filtered = useMemo(() => {
    const all = (todosQuery.data ?? []).filter(
      // Archived subjects are hidden unless explicitly selected.
      (t) => subjectId === t.subject_id || !archivedIds.has(t.subject_id),
    );
    return sortTodos(
      filterTodos(all, filter, today, {
        subjectId: subjectId || null,
        categoryId: categoryId || null,
      }),
    );
  }, [todosQuery.data, filter, today, subjectId, categoryId, archivedIds]);

  const open = filter === "all" ? filtered.filter((t) => t.status === "todo") : filtered;
  const done = filter === "all" ? filtered.filter((t) => t.status === "done") : [];
  const subjectCategories = (categories ?? []).filter((c) => c.subject_id === subjectId);

  const openDialog = (todo: Todo | null) => setDialog({ open: true, todo });

  const loading = todosQuery.isLoading || subjectsQuery.isLoading;
  const error = todosQuery.error || subjectsQuery.error;

  return (
    <>
      <PageHeader
        title="할 일"
        description="과목별로 나눠 보여주고, 과목 안에서는 마감일이 빠른 순, 그다음 우선순위 순이에요."
        actions={
          <Button onClick={() => openDialog(null)}>
            <Plus aria-hidden className="size-4" />할 일 추가
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="할 일 필터"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((f) => ({ value: f, label: TODO_FILTER_LABELS[f] }))}
        />
        <div className="flex gap-2">
          <Select
            aria-label="과목으로 거르기"
            className="w-auto min-w-36"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setCategoryId("");
            }}
          >
            <option value="">모든 과목</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.is_archived ? " (보관됨)" : ""}
              </option>
            ))}
          </Select>
          {subjectId && (
            <Select
              aria-label="카테고리로 거르기"
              className="w-auto min-w-32"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">모든 카테고리</option>
              <option value="none">미분류</option>
              {subjectCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <Card>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            onRetry={() => {
              void todosQuery.mutate();
              void subjectsQuery.mutate();
            }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={EMPTY_COPY[filter]}
            description={filter === "all" ? "할 일을 추가해 보세요." : undefined}
            action={
              filter === "all" ? (
                <Button onClick={() => openDialog(null)}>
                  <Plus aria-hidden className="size-4" />할 일 추가
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="px-5 py-2">
            {open.length > 0 ? (
              <SubjectTodoSections
                todos={open}
                subjects={subjects}
                categoryMap={categoryMap}
                today={today}
                onOpen={openDialog}
              />
            ) : (
              <p className="text-fg-secondary py-4 text-sm">남은 할 일을 모두 끝냈어요.</p>
            )}

            {done.length > 0 && (
              <div className="border-border border-t py-2">
                <button
                  type="button"
                  aria-expanded={showDone}
                  onClick={() => setShowDone((v) => !v)}
                  className="text-fg-secondary hover:text-fg flex h-9 items-center gap-1.5 rounded-md text-sm font-medium"
                >
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-4 transition-transform duration-150",
                      showDone && "rotate-180",
                    )}
                  />
                  완료한 할 일 {done.length}개
                </button>
                {showDone && (
                  <SubjectTodoSections
                    todos={done}
                    subjects={subjects}
                    categoryMap={categoryMap}
                    today={today}
                    onOpen={openDialog}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      <TodoFormDialog
        open={dialog.open}
        todo={dialog.todo}
        defaults={{
          subjectId: subjectId || null,
          categoryId: categoryId && categoryId !== "none" ? categoryId : null,
        }}
        onClose={() => setDialog({ open: false, todo: null })}
      />
    </>
  );
}
