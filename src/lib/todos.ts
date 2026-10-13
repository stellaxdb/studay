import { diffDays } from "@/lib/time";
import type { Priority, Subject, Todo } from "@/lib/types";

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** Days ahead (including today) that count as "마감 임박". */
export const DUE_SOON_DAYS = 3;

/**
 * Default order: open before done, then due date (earliest first, no date
 * last), then priority, then creation time.
 */
export function compareTodos(a: Todo, b: Todo): number {
  if (a.status !== b.status) return a.status === "todo" ? -1 : 1;
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  if (a.priority !== b.priority) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort(compareTodos);
}

export function isOverdue(todo: Todo, todayKey: string): boolean {
  return todo.status === "todo" && !!todo.due_date && todo.due_date < todayKey;
}

export function isDueSoon(todo: Todo, todayKey: string, days = DUE_SOON_DAYS): boolean {
  if (todo.status !== "todo" || !todo.due_date) return false;
  const diff = diffDays(todayKey, todo.due_date);
  return diff >= 0 && diff < days;
}

export type TodoFilter = "all" | "today" | "open" | "done" | "due-soon" | "overdue";

export const TODO_FILTER_LABELS: Record<TodoFilter, string> = {
  all: "전체",
  today: "오늘",
  open: "미완료",
  done: "완료",
  "due-soon": "마감 임박",
  overdue: "기한 지남",
};

export function filterTodos(
  todos: Todo[],
  filter: TodoFilter,
  todayKey: string,
  opts: { subjectId?: string | null; categoryId?: string | null } = {},
): Todo[] {
  return todos.filter((t) => {
    if (opts.subjectId && t.subject_id !== opts.subjectId) return false;
    if (opts.categoryId === "none" && t.category_id !== null) return false;
    if (opts.categoryId && opts.categoryId !== "none" && t.category_id !== opts.categoryId)
      return false;
    switch (filter) {
      case "today":
        return t.due_date === todayKey;
      case "open":
        return t.status === "todo";
      case "done":
        return t.status === "done";
      case "due-soon":
        return isDueSoon(t, todayKey);
      case "overdue":
        return isOverdue(t, todayKey);
      default:
        return true;
    }
  });
}

export interface Progress {
  done: number;
  total: number;
  /** 0–100, or null when there is nothing to measure. */
  percent: number | null;
}

export function progressOf(todos: Todo[]): Progress {
  const total = todos.length;
  const done = todos.filter((t) => t.status === "done").length;
  return { done, total, percent: total === 0 ? null : Math.round((done / total) * 100) };
}

export function progressBySubject(todos: Todo[]): Map<string, Progress> {
  const groups = new Map<string, Todo[]>();
  for (const t of todos) {
    const list = groups.get(t.subject_id) ?? [];
    list.push(t);
    groups.set(t.subject_id, list);
  }
  const result = new Map<string, Progress>();
  for (const [id, list] of groups) result.set(id, progressOf(list));
  return result;
}

export interface SubjectTodoGroup {
  subjectId: string;
  subject: Subject | undefined;
  todos: Todo[];
}

/**
 * Splits todos into one group per subject, in the subjects' order (the order
 * set on the 과목 screen). Todos keep their order inside each group; subjects
 * without todos are left out, and unknown subjects come last.
 */
export function groupBySubject(todos: Todo[], subjects: Subject[]): SubjectTodoGroup[] {
  const groups = new Map<string, Todo[]>();
  for (const todo of todos) {
    const list = groups.get(todo.subject_id);
    if (list) list.push(todo);
    else groups.set(todo.subject_id, [todo]);
  }
  const ordered: SubjectTodoGroup[] = [];
  for (const subject of subjects) {
    const list = groups.get(subject.id);
    if (!list) continue;
    ordered.push({ subjectId: subject.id, subject, todos: list });
    groups.delete(subject.id);
  }
  for (const [subjectId, list] of groups) {
    ordered.push({ subjectId, subject: undefined, todos: list });
  }
  return ordered;
}
