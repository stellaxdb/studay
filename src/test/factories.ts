import type { Todo } from "@/lib/types";

/** Builds a Todo row for tests; pass only the fields the test cares about. */
export function todo(partial: Partial<Todo>): Todo {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    user_id: "u",
    subject_id: "s1",
    category_id: null,
    title: "t",
    note: null,
    status: "todo",
    priority: "medium",
    due_date: null,
    estimated_minutes: null,
    completed_at: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...partial,
  };
}
