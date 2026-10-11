"use client";

import { ArrowRight, BookOpen, ListChecks, Play, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TodoFormDialog } from "@/components/todo/todo-form-dialog";
import { TodoRow } from "@/components/todo/todo-row";
import { ColorDot } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { ProgressBar } from "@/components/ui/progress";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  useCategories,
  useSettings,
  useStudyIntervals,
  useSubjects,
  useTodos,
} from "@/lib/data/queries";
import { useActiveElapsed, useWeek } from "@/lib/hooks";
import { aggregateStudy, sumBySubject, sumDays } from "@/lib/stats";
import { formatClock, formatDayLabel, formatDuration } from "@/lib/time";
import { isDueSoon, isOverdue, progressBySubject, sortTodos } from "@/lib/todos";
import type { Category, Subject, Todo } from "@/lib/types";

export function DashboardView() {
  const week = useWeek();
  const { today, timeZone } = week;
  const settingsQuery = useSettings();
  const subjectsQuery = useSubjects();
  const todosQuery = useTodos();
  const { data: categories } = useCategories();
  const intervalsQuery = useStudyIntervals(week.from, week.to);
  const active = useActiveElapsed();

  const [todoDialog, setTodoDialog] = useState<{ open: boolean; todo: Todo | null }>({
    open: false,
    todo: null,
  });

  const subjects = useMemo(
    () => (subjectsQuery.data ?? []).filter((s) => !s.is_archived),
    [subjectsQuery.data],
  );
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );
  // Only todos of active (non-archived) subjects count on the dashboard.
  const todos = useMemo(
    () => (todosQuery.data ?? []).filter((t) => subjectMap.has(t.subject_id)),
    [todosQuery.data, subjectMap],
  );

  const stats = useMemo(
    () => aggregateStudy(intervalsQuery.data ?? [], timeZone),
    [intervalsQuery.data, timeZone],
  );
  const todaySeconds = stats.byDay.get(today) ?? 0;
  const weekSeconds = sumDays(stats, week.days);
  const weekBySubject = sumBySubject(stats, week.days);
  const dailyGoal = (settingsQuery.data?.daily_goal_minutes ?? 0) * 60;
  const weeklyGoal = subjects.reduce((sum, s) => sum + s.weekly_goal_minutes * 60, 0);

  const dueToday = sortTodos(todos.filter((t) => t.due_date === today));
  const overdue = sortTodos(todos.filter((t) => isOverdue(t, today)));
  const upcoming = sortTodos(todos.filter((t) => isDueSoon(t, today) && t.due_date !== today));
  const doneToday = dueToday.filter((t) => t.status === "done").length;
  const progress = progressBySubject(todos);

  const name = settingsQuery.data?.display_name;
  const loading = subjectsQuery.isLoading || todosQuery.isLoading || settingsQuery.isLoading;
  const error = subjectsQuery.error || todosQuery.error || settingsQuery.error;

  if (loading) return <LoadingState className="py-24" />;
  if (error)
    return (
      <ErrorState
        onRetry={() => {
          void subjectsQuery.mutate();
          void todosQuery.mutate();
          void settingsQuery.mutate();
        }}
      />
    );

  const studyValue = (seconds: number) => (intervalsQuery.error ? "—" : formatDuration(seconds));

  return (
    <>
      <PageHeader
        title={name ? `${name}님, 안녕하세요` : "안녕하세요"}
        description={formatDayLabel(today)}
        actions={
          <>
            <Link href="/focus" className={buttonClasses("secondary")}>
              <Play aria-hidden className="size-4" />
              공부 시작
            </Link>
            <Button onClick={() => setTodoDialog({ open: true, todo: null })}>
              <Plus aria-hidden className="size-4" />할 일 추가
            </Button>
          </>
        }
      />

      {active.session && (
        <Link
          href="/focus"
          className="border-primary/30 bg-primary-subtle hover:border-primary/50 mb-6 flex items-center justify-between gap-4 rounded-[var(--radius-card)] border px-5 py-4"
        >
          <span className="min-w-0">
            <span className="text-primary block text-sm font-semibold">
              {active.session.status === "running" ? "공부 중이에요" : "일시정지 중이에요"}
            </span>
            <span className="text-fg mt-0.5 flex items-center gap-1.5 text-sm">
              <ColorDot color={subjectMap.get(active.session.subject_id)?.color ?? "#64748B"} />
              {subjectMap.get(active.session.subject_id)?.name ?? "과목"}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="tabular text-fg text-2xl font-bold">
              {formatClock(active.elapsed)}
            </span>
            <ArrowRight aria-hidden className="text-primary size-5" />
          </span>
        </Link>
      )}

      <section
        aria-label="오늘 요약"
        className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4"
      >
        <Metric
          label="오늘 할 일"
          value={dueToday.length === 0 ? "없음" : `${doneToday} / ${dueToday.length}`}
          hint={dueToday.length === 0 ? "오늘 마감인 할 일" : "완료 / 오늘 마감"}
        />
        <Metric
          label="오늘 공부한 시간"
          value={studyValue(todaySeconds)}
          hint={dailyGoal > 0 ? `목표 ${formatDuration(dailyGoal)}` : "일일 목표 미설정"}
          progress={
            dailyGoal > 0
              ? { value: todaySeconds, max: dailyGoal, label: "일일 목표 달성률" }
              : undefined
          }
        />
        <Metric
          label="이번 주 공부 시간"
          value={studyValue(weekSeconds)}
          hint={
            weeklyGoal > 0 ? `과목 목표 합계 ${formatDuration(weeklyGoal)}` : "주간 목표 미설정"
          }
          progress={
            weeklyGoal > 0
              ? { value: weekSeconds, max: weeklyGoal, label: "주간 목표 달성률" }
              : undefined
          }
        />
        <Metric
          label="기한 지난 할 일"
          value={`${overdue.length}개`}
          hint={overdue.length > 0 ? "먼저 확인해 보세요" : "모두 기한 안에 있어요"}
          tone={overdue.length > 0 ? "danger" : undefined}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Card>
          <CardHeader
            title="오늘의 할 일"
            action={
              <Link
                href="/todos"
                className="text-fg-secondary hover:bg-surface-subtle hover:text-fg inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium"
              >
                전체 보기
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            }
          />
          {subjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="아직 등록한 과목이 없어요."
              description="과목을 추가하고 할 일을 등록해 보세요."
              action={
                <Link href="/subjects" className={buttonClasses("primary")}>
                  과목 추가
                </Link>
              }
            />
          ) : dueToday.length === 0 && overdue.length === 0 && upcoming.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="오늘 예정된 할 일이 없어요."
              description="할 일을 추가해 보세요."
              action={
                <Button
                  variant="secondary"
                  onClick={() => setTodoDialog({ open: true, todo: null })}
                >
                  <Plus aria-hidden className="size-4" />할 일 추가
                </Button>
              }
            />
          ) : (
            <div className="px-5 pb-3">
              <TodoGroup
                title="기한 지남"
                tone="danger"
                todos={overdue}
                today={today}
                subjectMap={subjectMap}
                categoryMap={categoryMap}
                onOpen={(todo) => setTodoDialog({ open: true, todo })}
              />
              <TodoGroup
                title="오늘 마감"
                todos={dueToday}
                today={today}
                subjectMap={subjectMap}
                categoryMap={categoryMap}
                onOpen={(todo) => setTodoDialog({ open: true, todo })}
                emptyText="오늘 마감인 할 일이 없어요."
              />
              <TodoGroup
                title="마감 임박"
                todos={upcoming}
                today={today}
                subjectMap={subjectMap}
                categoryMap={categoryMap}
                onOpen={(todo) => setTodoDialog({ open: true, todo })}
              />
            </div>
          )}
        </Card>

        <Card className="self-start">
          <CardHeader title="과목별 현황" description="할 일 완료율과 이번 주 공부 시간" />
          {subjects.length === 0 ? (
            <EmptyState title="과목을 추가하면 진행률이 표시돼요." />
          ) : (
            <ul className="flex flex-col gap-4 px-5 pb-5">
              {subjects.map((s) => {
                const p = progress.get(s.id) ?? { done: 0, total: 0, percent: null };
                const seconds = weekBySubject.get(s.id) ?? 0;
                return (
                  <li key={s.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <Link
                        href="/subjects"
                        className="flex min-w-0 items-center gap-2 text-sm font-medium hover:underline"
                      >
                        <ColorDot color={s.color} className="size-2.5" />
                        <span className="truncate">{s.name}</span>
                      </Link>
                      <span className="tabular text-fg-secondary shrink-0 text-xs">
                        {p.percent === null ? "할 일 없음" : `${p.percent}% · ${p.done}/${p.total}`}
                      </span>
                    </div>
                    <ProgressBar
                      className="mt-2"
                      value={p.percent ?? 0}
                      color={s.color}
                      label={`${s.name} 할 일 완료율`}
                    />
                    <p className="tabular text-fg-secondary mt-1.5 text-xs">
                      이번 주 {studyValue(seconds)}
                      {s.weekly_goal_minutes > 0 &&
                        ` / 목표 ${formatDuration(s.weekly_goal_minutes * 60)}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <TodoFormDialog
        open={todoDialog.open}
        todo={todoDialog.todo}
        defaults={{ dueDate: today }}
        onClose={() => setTodoDialog({ open: false, todo: null })}
      />
    </>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
  progress,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "danger";
  progress?: { value: number; max: number; label: string };
}) {
  return (
    <div className="border-border bg-surface rounded-[var(--radius-card)] border p-4 lg:p-5">
      <p className="text-fg-secondary text-sm font-medium">{label}</p>
      <p
        className={cn(
          "tabular mt-1.5 text-xl font-bold tracking-tight lg:text-2xl",
          tone === "danger" ? "text-danger" : "text-fg",
        )}
      >
        {value}
      </p>
      {progress && <ProgressBar className="mt-3" {...progress} />}
      {hint && <p className="text-fg-secondary mt-2 text-xs">{hint}</p>}
    </div>
  );
}

function TodoGroup({
  title,
  tone,
  todos,
  today,
  subjectMap,
  categoryMap,
  onOpen,
  emptyText,
}: {
  title: string;
  tone?: "danger";
  todos: Todo[];
  today: string;
  subjectMap: Map<string, Subject>;
  categoryMap: Map<string, Category>;
  onOpen: (todo: Todo) => void;
  emptyText?: string;
}) {
  if (todos.length === 0 && !emptyText) return null;
  return (
    <section className="py-1">
      <h3
        className={cn(
          "pt-2 text-xs font-semibold",
          tone === "danger" ? "text-danger" : "text-fg-secondary",
        )}
      >
        {title} {todos.length > 0 && todos.length}
      </h3>
      {todos.length === 0 ? (
        <p className="text-fg-tertiary py-3 text-sm">{emptyText}</p>
      ) : (
        <ul className="divide-border divide-y">
          {todos.map((t) => (
            <TodoRow
              key={t.id}
              todo={t}
              today={today}
              compact
              subject={subjectMap.get(t.subject_id)}
              category={t.category_id ? categoryMap.get(t.category_id) : undefined}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
