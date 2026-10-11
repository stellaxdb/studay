"use client";

import { BookOpen, History, Pause, Pencil, Play, Square, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SessionEditDialog } from "@/components/timer/session-edit-dialog";
import { ColorDot } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Select, Textarea } from "@/components/ui/field";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  deleteSession,
  discardSession,
  finishSession,
  pauseSession,
  resumeSession,
  startSession,
} from "@/lib/data/mutations";
import { useSessions, useStudyIntervals, useSubjects, useTodos } from "@/lib/data/queries";
import { toUserMessage } from "@/lib/errors";
import { useActiveElapsed, useTimeZone, useToday } from "@/lib/hooks";
import { aggregateStudy } from "@/lib/stats";
import {
  addDaysToKey,
  dayKey,
  formatClock,
  formatDayLabel,
  formatDuration,
  formatTime,
  startOfDayKey,
} from "@/lib/time";
import { sortTodos } from "@/lib/todos";
import type { StudySession } from "@/lib/types";

type Action = "start" | "pause" | "resume" | "finish" | "discard" | null;

export function FocusView() {
  const toast = useToast();
  const params = useSearchParams();
  const timeZone = useTimeZone();
  const today = useToday();
  const active = useActiveElapsed();
  const subjectsQuery = useSubjects();
  const { data: todos } = useTodos();

  const [subjectChoice, setSubjectChoice] = useState<string>(params.get("subject") ?? "");
  const [todoId, setTodoId] = useState<string>(params.get("todo") ?? "");
  const [busy, setBusy] = useState<Action>(null);
  const [lastError, setLastError] = useState<{
    action: Exclude<Action, null>;
    message: string;
  } | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [finishNote, setFinishNote] = useState("");
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [deletingSession, setDeletingSession] = useState<StudySession | null>(null);

  const subjects = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data]);
  const activeSubjects = subjects.filter((s) => !s.is_archived);
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const subjectId = activeSubjects.some((s) => s.id === subjectChoice)
    ? subjectChoice
    : (activeSubjects[0]?.id ?? "");
  const subjectTodos = sortTodos(
    (todos ?? []).filter((t) => t.subject_id === subjectId && t.status === "todo"),
  );

  // Recent records: the last 7 days in the user's timezone.
  const rangeFrom = startOfDayKey(addDaysToKey(today, -6), timeZone).toISOString();
  const rangeTo = startOfDayKey(addDaysToKey(today, 1), timeZone).toISOString();
  const sessionsQuery = useSessions(rangeFrom, rangeTo);
  const todayRange = {
    from: startOfDayKey(today, timeZone).toISOString(),
    to: rangeTo,
  };
  const todayIntervals = useStudyIntervals(todayRange.from, todayRange.to);
  const todaySeconds = useMemo(
    () => aggregateStudy(todayIntervals.data ?? [], timeZone).byDay.get(today) ?? 0,
    [todayIntervals.data, timeZone, today],
  );

  const session = active.session;
  const sessionSubject = session ? subjectMap.get(session.subject_id) : undefined;
  const sessionTodo = session?.todo_id ? todos?.find((t) => t.id === session.todo_id) : undefined;

  // Show the running clock in the tab title.
  useEffect(() => {
    if (!session) return;
    const prev = document.title;
    document.title = `${formatClock(active.elapsed)} ${session.status === "running" ? "공부 중" : "일시정지"} · studay`;
    return () => {
      document.title = prev;
    };
  }, [session, active.elapsed]);

  async function run(action: Exclude<Action, null>, fn: () => Promise<unknown>, success?: string) {
    setBusy(action);
    setLastError(null);
    try {
      await fn();
      if (success) toast.success(success);
      return true;
    } catch (error) {
      const message = toUserMessage(error);
      setLastError({ action, message });
      toast.error(message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  const retry = () => {
    if (!lastError || !session) return;
    if (lastError.action === "pause") void run("pause", () => pauseSession(session.id));
    if (lastError.action === "resume") void run("resume", () => resumeSession(session.id));
    if (lastError.action === "finish") setConfirmFinish(true);
  };

  const sessionsByDay = useMemo(() => {
    const groups = new Map<string, StudySession[]>();
    for (const s of sessionsQuery.data ?? []) {
      const key = dayKey(s.started_at, timeZone);
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return [...groups.entries()];
  }, [sessionsQuery.data, timeZone]);

  if (active.isLoading || subjectsQuery.isLoading) return <LoadingState className="py-24" />;
  if (active.error || subjectsQuery.error)
    return (
      <ErrorState
        message="타이머 상태를 불러오지 못했어요."
        onRetry={() => {
          void active.mutate();
          void subjectsQuery.mutate();
        }}
      />
    );

  return (
    <>
      <PageHeader
        title="공부 타이머"
        description="과목을 고르고 시작하세요. 페이지를 닫거나 새로고침해도 시간은 계속 기록돼요."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-6 sm:p-8">
          {session ? (
            <div className="flex flex-col items-center text-center">
              <p
                className={
                  session.status === "running"
                    ? "bg-primary-subtle text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
                    : "bg-surface-subtle text-fg-secondary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
                }
              >
                {session.status === "running" ? (
                  <Play aria-hidden className="size-3.5" />
                ) : (
                  <Pause aria-hidden className="size-3.5" />
                )}
                {session.status === "running" ? "공부 중" : "일시정지됨"}
              </p>
              <p
                className="tabular text-fg mt-6 text-5xl font-bold tracking-tight sm:text-6xl"
                aria-label={`경과 시간 ${formatDuration(active.elapsed)}`}
              >
                {formatClock(active.elapsed)}
              </p>
              <p className="text-fg mt-4 flex items-center gap-2 text-base font-medium">
                {sessionSubject && <ColorDot color={sessionSubject.color} className="size-2.5" />}
                {sessionSubject?.name ?? "삭제된 과목"}
              </p>
              {sessionTodo && (
                <p className="text-fg-secondary mt-1 text-sm">할 일: {sessionTodo.title}</p>
              )}
              <p className="text-fg-tertiary mt-1 text-xs">
                {formatTime(session.started_at, timeZone)}에 시작
              </p>

              <div className="mt-8 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
                {session.status === "running" ? (
                  <Button
                    variant="secondary"
                    className="h-12 flex-1 text-base"
                    loading={busy === "pause"}
                    disabled={busy !== null}
                    onClick={() => run("pause", () => pauseSession(session.id))}
                  >
                    {busy !== "pause" && <Pause aria-hidden className="size-5" />}
                    일시정지
                  </Button>
                ) : (
                  <Button
                    className="h-12 flex-1 text-base"
                    loading={busy === "resume"}
                    disabled={busy !== null}
                    onClick={() => run("resume", () => resumeSession(session.id))}
                  >
                    {busy !== "resume" && <Play aria-hidden className="size-5" />}
                    재개
                  </Button>
                )}
                <Button
                  variant={session.status === "running" ? "primary" : "secondary"}
                  className="h-12 flex-1 text-base"
                  disabled={busy !== null}
                  onClick={() => {
                    setFinishNote("");
                    setConfirmFinish(true);
                  }}
                >
                  <Square aria-hidden className="size-4" />
                  공부 종료
                </Button>
              </div>
              <Button
                variant="tertiary"
                size="sm"
                className="mt-3"
                disabled={busy !== null}
                onClick={() => setConfirmDiscard(true)}
              >
                기록하지 않고 취소
              </Button>

              <div aria-live="polite" className="mt-4 min-h-5 text-xs">
                {lastError ? (
                  <span className="text-danger">
                    {lastError.message}{" "}
                    {lastError.action !== "start" && lastError.action !== "discard" && (
                      <button type="button" className="font-semibold underline" onClick={retry}>
                        다시 시도
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="text-fg-tertiary">
                    서버 시각을 기준으로 계산해서 탭을 닫아도 시간이 정확해요.
                  </span>
                )}
              </div>
            </div>
          ) : activeSubjects.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="아직 등록한 과목이 없어요."
              description="과목을 추가하면 과목별로 공부 시간을 기록할 수 있어요."
              action={
                <Link href="/subjects" className={buttonClasses("primary")}>
                  과목 추가
                </Link>
              }
            />
          ) : (
            <form
              className="mx-auto flex max-w-md flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void run(
                  "start",
                  () =>
                    startSession(
                      subjectId,
                      todoId && subjectTodos.some((t) => t.id === todoId) ? todoId : null,
                    ),
                  "공부를 시작했어요.",
                );
              }}
            >
              <p className="tabular text-fg-tertiary py-4 text-center text-5xl font-bold tracking-tight sm:text-6xl">
                00:00:00
              </p>
              <Field label="과목">
                {({ id }) => (
                  <Select
                    id={id}
                    value={subjectId}
                    onChange={(e) => {
                      setSubjectChoice(e.target.value);
                      setTodoId("");
                    }}
                  >
                    {activeSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="연결할 할 일" optional>
                {({ id }) => (
                  <Select id={id} value={todoId} onChange={(e) => setTodoId(e.target.value)}>
                    <option value="">연결하지 않음</option>
                    {subjectTodos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Button type="submit" className="mt-2 h-12 text-base" loading={busy === "start"}>
                {busy !== "start" && <Play aria-hidden className="size-5" />}
                공부 시작
              </Button>
              {lastError?.action === "start" && (
                <p role="alert" className="text-danger text-center text-sm">
                  {lastError.message}
                </p>
              )}
            </form>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <p className="text-fg-secondary text-sm font-medium">오늘 기록한 공부 시간</p>
            <p className="tabular mt-1 text-2xl font-bold">
              {todayIntervals.error ? "—" : formatDuration(todaySeconds)}
            </p>
            <p className="text-fg-tertiary mt-1 text-xs">
              {session ? "진행 중인 공부는 종료하면 더해져요." : "종료한 공부 기록만 합산해요."}
            </p>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="최근 7일 기록"
          description="잘못 기록된 시간은 수정하거나 삭제할 수 있어요."
        />
        {sessionsQuery.isLoading ? (
          <LoadingState />
        ) : sessionsQuery.error ? (
          <ErrorState onRetry={() => void sessionsQuery.mutate()} />
        ) : sessionsByDay.length === 0 ? (
          <EmptyState
            icon={History}
            title="아직 공부 기록이 없어요."
            description="타이머로 공부를 마치면 여기에 기록이 쌓여요."
          />
        ) : (
          <div className="px-5 pb-4">
            {sessionsByDay.map(([key, list]) => (
              <section key={key} aria-label={formatDayLabel(key)} className="py-2">
                <h3 className="flex items-baseline justify-between py-2 text-sm font-semibold">
                  {key === today ? "오늘" : formatDayLabel(key)}
                  <span className="tabular text-fg-secondary text-xs font-medium">
                    {formatDuration(list.reduce((sum, s) => sum + s.total_seconds, 0))}
                  </span>
                </h3>
                <ul className="divide-border border-border divide-y rounded-[var(--radius-control)] border">
                  {list.map((s) => {
                    const subj = subjectMap.get(s.subject_id);
                    return (
                      <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                        <ColorDot color={subj?.color ?? "#64748B"} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{subj?.name ?? "과목"}</p>
                          <p className="tabular text-fg-secondary text-xs">
                            {formatTime(s.started_at, timeZone)} –{" "}
                            {s.ended_at && formatTime(s.ended_at, timeZone)}
                            {s.note && ` · ${s.note}`}
                          </p>
                        </div>
                        <span className="tabular text-sm font-semibold">
                          {formatDuration(s.total_seconds)}
                        </span>
                        <Button
                          variant="tertiary"
                          size="icon-sm"
                          aria-label="기록 수정"
                          onClick={() => setEditing(s)}
                        >
                          <Pencil aria-hidden className="size-4" />
                        </Button>
                        <Button
                          variant="tertiary"
                          size="icon-sm"
                          aria-label="기록 삭제"
                          onClick={() => setDeletingSession(s)}
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        tone="primary"
        title="공부를 종료하고 기록할까요?"
        description={
          session && (
            <span className="tabular">
              {sessionSubject?.name ?? "과목"} · {formatDuration(active.elapsed)}
            </span>
          )
        }
        confirmLabel="공부 종료"
        onConfirm={async () => {
          if (!session) return;
          const ok = await run(
            "finish",
            () => finishSession(session.id, finishNote.trim() || null),
            "공부 기록을 저장했어요.",
          );
          if (!ok) return false;
          setTodoId("");
        }}
      >
        <Field label="메모" optional>
          {({ id }) => (
            <Textarea
              id={id}
              className="min-h-16"
              maxLength={500}
              placeholder="예: 3장 연습문제까지"
              value={finishNote}
              onChange={(e) => setFinishNote(e.target.value)}
            />
          )}
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="기록하지 않고 취소할까요?"
        description="지금까지 공부한 시간은 저장되지 않아요."
        confirmLabel="기록 취소"
        onConfirm={async () => {
          if (!session) return;
          const ok = await run("discard", () => discardSession(session.id), "타이머를 취소했어요.");
          if (!ok) return false;
        }}
      />

      <ConfirmDialog
        open={deletingSession !== null}
        onClose={() => setDeletingSession(null)}
        title="이 공부 기록을 삭제할까요?"
        description={
          deletingSession &&
          `${subjectMap.get(deletingSession.subject_id)?.name ?? "과목"} · ${formatDuration(deletingSession.total_seconds)}이 공부 시간 통계에서 빠져요.`
        }
        confirmLabel="기록 삭제"
        onConfirm={async () => {
          if (!deletingSession) return;
          try {
            await deleteSession(deletingSession.id);
            toast.success("공부 기록을 삭제했어요.");
          } catch (error) {
            toast.error(toUserMessage(error, "삭제하지 못했어요. 다시 시도해 주세요."));
            return false;
          }
        }}
      />

      <SessionEditDialog
        session={editing}
        subjects={subjects}
        timeZone={timeZone}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
