"use client";

import {
  Archive,
  ArchiveRestore,
  BookOpen,
  ListChecks,
  Pencil,
  Plus,
  Timer,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CategoryManager } from "@/components/subject/category-manager";
import { SubjectFormDialog } from "@/components/subject/subject-form-dialog";
import { TodoFormDialog } from "@/components/todo/todo-form-dialog";
import { TodoRow } from "@/components/todo/todo-row";
import { Badge, ColorDot } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { deleteSubject, updateSubject } from "@/lib/data/mutations";
import { useCategories, useStudyIntervals, useSubjects, useTodos } from "@/lib/data/queries";
import { toUserMessage } from "@/lib/errors";
import { useWeek } from "@/lib/hooks";
import { aggregateStudy, sumBySubject } from "@/lib/stats";
import { formatDuration } from "@/lib/time";
import { filterTodos, progressOf, sortTodos } from "@/lib/todos";
import type { Subject, Todo } from "@/lib/types";

type TodoTab = "open" | "done" | "all";

export function SubjectsView() {
  const toast = useToast();
  const week = useWeek();
  const subjectsQuery = useSubjects();
  const todosQuery = useTodos();
  const { data: categories } = useCategories();
  const intervalsQuery = useStudyIntervals(week.from, week.to);

  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subjectDialog, setSubjectDialog] = useState<{ open: boolean; subject: Subject | null }>({
    open: false,
    subject: null,
  });
  const [todoDialog, setTodoDialog] = useState<{ open: boolean; todo: Todo | null }>({
    open: false,
    todo: null,
  });
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [todoTab, setTodoTab] = useState<TodoTab>("open");
  const [categoryFilter, setCategoryFilter] = useState("");

  const subjects = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data]);
  const visible = subjects.filter((s) => s.is_archived === showArchived);
  const selected =
    subjects.find((s) => s.id === selectedId && s.is_archived === showArchived) ??
    visible[0] ??
    null;

  const todos = useMemo(() => todosQuery.data ?? [], [todosQuery.data]);
  const weekBySubject = useMemo(
    () => sumBySubject(aggregateStudy(intervalsQuery.data ?? [], week.timeZone), week.days),
    [intervalsQuery.data, week.timeZone, week.days],
  );

  const subjectTodos = selected ? todos.filter((t) => t.subject_id === selected.id) : [];
  const subjectCategories = selected
    ? (categories ?? []).filter((c) => c.subject_id === selected.id)
    : [];
  const categoryMap = new Map(subjectCategories.map((c) => [c.id, c]));
  const listed = sortTodos(
    filterTodos(subjectTodos, todoTab === "all" ? "all" : todoTab, week.today, {
      categoryId: categoryFilter || null,
    }),
  );

  async function toggleArchive(subject: Subject) {
    try {
      await updateSubject(subject.id, { is_archived: !subject.is_archived });
      toast.success(subject.is_archived ? "과목을 다시 활성화했어요." : "과목을 보관했어요.");
      setSelectedId(null);
    } catch (error) {
      toast.error(toUserMessage(error));
    }
  }

  if (subjectsQuery.isLoading || todosQuery.isLoading) return <LoadingState className="py-24" />;
  if (subjectsQuery.error || todosQuery.error)
    return (
      <ErrorState
        onRetry={() => {
          void subjectsQuery.mutate();
          void todosQuery.mutate();
        }}
      />
    );

  const archivedCount = subjects.filter((s) => s.is_archived).length;

  return (
    <>
      <PageHeader
        title="과목"
        description="과목별 카테고리와 할 일, 이번 주 공부 시간을 관리해요."
        actions={
          <Button onClick={() => setSubjectDialog({ open: true, subject: null })}>
            <Plus aria-hidden className="size-4" />
            과목 추가
          </Button>
        }
      />

      {subjects.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="아직 등록한 과목이 없어요."
            description="수강 중인 과목을 추가하면 할 일과 공부 시간을 과목별로 볼 수 있어요."
            action={
              <Button onClick={() => setSubjectDialog({ open: true, subject: null })}>
                <Plus aria-hidden className="size-4" />
                과목 추가
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Subject list */}
          <Card className="self-start">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <Segmented
                size="sm"
                label="과목 보기"
                value={showArchived ? "archived" : "active"}
                onChange={(v) => {
                  setShowArchived(v === "archived");
                  setSelectedId(null);
                }}
                options={[
                  { value: "active", label: "수강 중" },
                  { value: "archived", label: `보관됨 ${archivedCount}` },
                ]}
              />
            </div>
            {visible.length === 0 ? (
              <p className="text-fg-secondary px-4 pt-2 pb-5 text-sm">
                {showArchived ? "보관한 과목이 없어요." : "수강 중인 과목이 없어요."}
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5 p-2">
                {visible.map((s) => {
                  const p = progressOf(todos.filter((t) => t.subject_id === s.id));
                  const isSelected = selected?.id === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        aria-current={isSelected ? "true" : undefined}
                        onClick={() => {
                          setSelectedId(s.id);
                          setCategoryFilter("");
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-left transition-colors duration-150",
                          isSelected ? "bg-primary-subtle" : "hover:bg-surface-subtle",
                        )}
                      >
                        <ColorDot color={s.color} className="size-2.5" />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-sm font-medium",
                              isSelected ? "text-primary" : "text-fg",
                            )}
                          >
                            {s.name}
                          </span>
                          <span className="tabular text-fg-secondary block text-xs">
                            할 일 {p.done}/{p.total} · 이번 주{" "}
                            {formatDuration(weekBySubject.get(s.id) ?? 0)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Detail */}
          {selected && (
            <div className="flex min-w-0 flex-col gap-6">
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-xl font-bold">
                      <ColorDot color={selected.color} className="size-3" />
                      <span className="truncate">{selected.name}</span>
                      {selected.is_archived && <Badge>보관됨</Badge>}
                    </h2>
                    {selected.description && (
                      <p className="text-fg-secondary mt-1 text-sm whitespace-pre-line">
                        {selected.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {!selected.is_archived && (
                      <Link
                        href={`/focus?subject=${selected.id}`}
                        className={buttonClasses("secondary", "sm")}
                      >
                        <Timer aria-hidden className="size-4" />
                        공부 시작
                      </Link>
                    )}
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => setSubjectDialog({ open: true, subject: selected })}
                    >
                      <Pencil aria-hidden className="size-4" />
                      수정
                    </Button>
                    <Button variant="tertiary" size="sm" onClick={() => toggleArchive(selected)}>
                      {selected.is_archived ? (
                        <ArchiveRestore aria-hidden className="size-4" />
                      ) : (
                        <Archive aria-hidden className="size-4" />
                      )}
                      {selected.is_archived ? "보관 해제" : "보관"}
                    </Button>
                    <Button variant="tertiary" size="sm" onClick={() => setDeleting(selected)}>
                      <Trash2 aria-hidden className="size-4" />
                      삭제
                    </Button>
                  </div>
                </div>

                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <SubjectStat
                    label="할 일 진행률"
                    value={(() => {
                      const p = progressOf(subjectTodos);
                      return p.percent === null
                        ? "할 일 없음"
                        : `${p.percent}% (${p.done}/${p.total})`;
                    })()}
                    progress={progressOf(subjectTodos).percent ?? 0}
                    color={selected.color}
                    progressLabel={`${selected.name} 할 일 진행률`}
                  />
                  <SubjectStat
                    label="이번 주 공부 시간"
                    value={
                      intervalsQuery.error
                        ? "불러오지 못했어요"
                        : selected.weekly_goal_minutes > 0
                          ? `${formatDuration(weekBySubject.get(selected.id) ?? 0)} / 목표 ${formatDuration(selected.weekly_goal_minutes * 60)}`
                          : formatDuration(weekBySubject.get(selected.id) ?? 0)
                    }
                    progress={
                      selected.weekly_goal_minutes > 0
                        ? ((weekBySubject.get(selected.id) ?? 0) /
                            (selected.weekly_goal_minutes * 60)) *
                          100
                        : null
                    }
                    color={selected.color}
                    progressLabel={`${selected.name} 주간 목표 달성률`}
                  />
                </dl>
              </Card>

              <Card>
                <CardHeader
                  title="카테고리"
                  description="같은 이름이라도 과목이 다르면 별개의 카테고리예요."
                />
                <div className="px-5 pb-5">
                  <CategoryManager
                    subjectId={selected.id}
                    categories={subjectCategories}
                    todos={subjectTodos}
                  />
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="할 일"
                  action={
                    !selected.is_archived && (
                      <Button size="sm" onClick={() => setTodoDialog({ open: true, todo: null })}>
                        <Plus aria-hidden className="size-4" />할 일 추가
                      </Button>
                    )
                  }
                />
                <div className="flex flex-wrap items-center gap-2 px-5">
                  <Segmented
                    size="sm"
                    label="할 일 상태"
                    value={todoTab}
                    onChange={setTodoTab}
                    options={[
                      { value: "open", label: "미완료" },
                      { value: "done", label: "완료" },
                      { value: "all", label: "전체" },
                    ]}
                  />
                  {subjectCategories.length > 0 && (
                    <Select
                      aria-label="카테고리로 거르기"
                      className="h-9 w-auto"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
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
                {listed.length === 0 ? (
                  <EmptyState
                    icon={ListChecks}
                    title={
                      todoTab === "done"
                        ? "완료한 할 일이 아직 없어요."
                        : todoTab === "open"
                          ? "남은 할 일이 없어요."
                          : "할 일을 추가해 보세요."
                    }
                  />
                ) : (
                  <ul className="divide-border divide-y px-5 pb-2">
                    {listed.map((t) => (
                      <TodoRow
                        key={t.id}
                        todo={t}
                        today={week.today}
                        showSubject={false}
                        category={t.category_id ? categoryMap.get(t.category_id) : undefined}
                        onOpen={(todo) => setTodoDialog({ open: true, todo })}
                      />
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      <SubjectFormDialog
        open={subjectDialog.open}
        subject={subjectDialog.subject}
        onClose={() => setSubjectDialog({ open: false, subject: null })}
        onCreated={(id) => {
          setShowArchived(false);
          setSelectedId(id);
        }}
      />
      <TodoFormDialog
        open={todoDialog.open}
        todo={todoDialog.todo}
        defaults={{
          subjectId: selected?.id ?? null,
          categoryId: categoryFilter && categoryFilter !== "none" ? categoryFilter : null,
        }}
        onClose={() => setTodoDialog({ open: false, todo: null })}
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`'${deleting?.name ?? ""}' 과목을 삭제할까요?`}
        confirmLabel="과목 삭제"
        description={
          <span className="flex flex-col gap-2">
            <span>삭제하면 되돌릴 수 없어요.</span>
            <span>
              카테고리, 할 일{" "}
              {deleting ? todos.filter((t) => t.subject_id === deleting.id).length : 0}개, 이 과목의
              공부 기록이 모두 삭제되고 전체 공부 시간에서도 빠져요. 진행 중인 타이머가 이 과목이면
              함께 삭제돼요. 캘린더 일정은 남지만 과목 연결이 해제돼요.
            </span>
            <span>기록을 남기고 목록에서만 숨기려면 &lsquo;보관&rsquo;을 사용하세요.</span>
          </span>
        }
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteSubject(deleting.id);
            toast.success("과목을 삭제했어요.");
            setSelectedId(null);
          } catch (error) {
            toast.error(toUserMessage(error, "삭제하지 못했어요. 다시 시도해 주세요."));
            return false;
          }
        }}
      />
    </>
  );
}

function SubjectStat({
  label,
  value,
  progress,
  color,
  progressLabel,
}: {
  label: string;
  value: string;
  progress: number | null;
  color: string;
  progressLabel: string;
}) {
  return (
    <div className="bg-surface-subtle rounded-[var(--radius-control)] px-4 py-3">
      <dt className="text-fg-secondary text-xs font-medium">{label}</dt>
      <dd className="tabular text-fg mt-1 text-sm font-semibold">{value}</dd>
      {progress !== null && (
        <ProgressBar
          value={progress}
          label={progressLabel}
          color={color}
          className="bg-border mt-2.5"
        />
      )}
    </div>
  );
}
