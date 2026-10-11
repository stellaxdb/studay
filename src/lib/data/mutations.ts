"use client";

import { getSupabase } from "@/lib/supabase/client";
import type { EventType, Priority, StudySession, TodoStatus } from "@/lib/types";
import { revalidate } from "./keys";

// Every mutation throws on failure so the caller can keep the user's input
// and show a retry path, then revalidates exactly the queries it affects.

function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function updateSettings(values: {
  display_name: string | null;
  timezone: string;
  daily_goal_minutes: number;
  week_starts_on: number;
}) {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  check(
    await supabase
      .from("user_settings")
      .update(values)
      .eq("user_id", auth.user?.id ?? ""),
  );
  await revalidate("settings", "intervals", "sessions");
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------
export interface SubjectInput {
  name: string;
  description: string | null;
  color: string;
  weekly_goal_minutes: number;
}

export async function createSubject(input: SubjectInput) {
  const row = check(await getSupabase().from("subjects").insert(input).select("id").single());
  await revalidate("subjects");
  return row as { id: string };
}

export async function updateSubject(
  id: string,
  input: Partial<SubjectInput & { is_archived: boolean }>,
) {
  check(await getSupabase().from("subjects").update(input).eq("id", id));
  await revalidate("subjects");
}

export async function deleteSubject(id: string) {
  check(await getSupabase().from("subjects").delete().eq("id", id));
  await revalidate(
    "subjects",
    "categories",
    "todos",
    "events",
    "intervals",
    "sessions",
    "active-session",
  );
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function createCategory(subjectId: string, name: string, sortOrder: number) {
  check(
    await getSupabase()
      .from("categories")
      .insert({ subject_id: subjectId, name, sort_order: sortOrder }),
  );
  await revalidate("categories");
}

export async function renameCategory(id: string, name: string) {
  check(await getSupabase().from("categories").update({ name }).eq("id", id));
  await revalidate("categories");
}

/** Persists a new order by rewriting sort_order for the given ids. */
export async function reorderCategories(orderedIds: string[]) {
  const supabase = getSupabase();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("categories").update({ sort_order: index }).eq("id", id),
    ),
  );
  await revalidate("categories");
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
}

/**
 * Deletes a category. Its TODOs either move to `moveTo` (same subject) or
 * become uncategorized (handled by ON DELETE SET NULL in the database).
 */
export async function deleteCategory(id: string, moveTo: string | null) {
  const supabase = getSupabase();
  if (moveTo) {
    check(await supabase.from("todos").update({ category_id: moveTo }).eq("category_id", id));
  }
  check(await supabase.from("categories").delete().eq("id", id));
  await revalidate("categories", "todos");
}

// ---------------------------------------------------------------------------
// TODOs
// ---------------------------------------------------------------------------
export interface TodoInput {
  title: string;
  subject_id: string;
  category_id: string | null;
  priority: Priority;
  due_date: string | null;
  estimated_minutes: number | null;
  note: string | null;
}

export async function createTodo(input: TodoInput) {
  check(await getSupabase().from("todos").insert(input));
  await revalidate("todos");
}

export async function updateTodo(id: string, input: Partial<TodoInput>) {
  check(await getSupabase().from("todos").update(input).eq("id", id));
  await revalidate("todos");
}

export async function setTodoStatus(id: string, status: TodoStatus) {
  // completed_at is maintained by a database trigger.
  check(await getSupabase().from("todos").update({ status }).eq("id", id));
  await revalidate("todos");
}

export async function deleteTodo(id: string) {
  check(await getSupabase().from("todos").delete().eq("id", id));
  await revalidate("todos", "active-session");
}

// ---------------------------------------------------------------------------
// Calendar events
// ---------------------------------------------------------------------------
export interface EventInput {
  title: string;
  event_type: EventType;
  subject_id: string | null;
  all_day: boolean;
  starts_at: string;
  ends_at: string | null;
  note: string | null;
}

export async function createEvent(input: EventInput) {
  check(await getSupabase().from("calendar_events").insert(input));
  await revalidate("events");
}

export async function updateEvent(id: string, input: EventInput) {
  check(await getSupabase().from("calendar_events").update(input).eq("id", id));
  await revalidate("events");
}

export async function deleteEvent(id: string) {
  check(await getSupabase().from("calendar_events").delete().eq("id", id));
  await revalidate("events");
}

// ---------------------------------------------------------------------------
// Study timer (database functions guarantee one active session and
// exactly-once accounting)
// ---------------------------------------------------------------------------
async function timerRpc(fn: string, args: Record<string, unknown>) {
  const data = check(await getSupabase().rpc(fn, args));
  return data as StudySession;
}

export async function startSession(subjectId: string, todoId: string | null) {
  try {
    return await timerRpc("start_study_session", { p_subject_id: subjectId, p_todo_id: todoId });
  } finally {
    await revalidate("active-session");
  }
}

export async function pauseSession(id: string) {
  try {
    return await timerRpc("pause_study_session", { p_session_id: id });
  } finally {
    await revalidate("active-session");
  }
}

export async function resumeSession(id: string) {
  try {
    return await timerRpc("resume_study_session", { p_session_id: id });
  } finally {
    await revalidate("active-session");
  }
}

export async function finishSession(id: string, note: string | null) {
  try {
    return await timerRpc("finish_study_session", { p_session_id: id, p_note: note });
  } finally {
    await revalidate("active-session", "intervals", "sessions");
  }
}

/** Discards a running/paused session without recording any time. */
export async function discardSession(id: string) {
  check(await getSupabase().from("study_sessions").delete().eq("id", id));
  await revalidate("active-session");
}

export async function updateSessionTime(id: string, startedAt: string, endedAt: string) {
  await timerRpc("update_study_session_time", {
    p_session_id: id,
    p_started_at: startedAt,
    p_ended_at: endedAt,
  });
  await revalidate("intervals", "sessions");
}

export async function updateSessionDetails(
  id: string,
  values: { subject_id: string; todo_id: string | null; note: string | null },
) {
  check(await getSupabase().from("study_sessions").update(values).eq("id", id));
  await revalidate("intervals", "sessions", "active-session");
}

export async function deleteSession(id: string) {
  check(await getSupabase().from("study_sessions").delete().eq("id", id));
  await revalidate("intervals", "sessions");
}
