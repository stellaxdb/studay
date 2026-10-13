import { describe, expect, it } from "vitest";
import {
  filterTodos,
  groupBySubject,
  isDueSoon,
  isOverdue,
  progressBySubject,
  sortTodos,
} from "@/lib/todos";
import type { Subject } from "@/lib/types";
import { todo } from "@/test/factories";

describe("sortTodos", () => {
  it("orders open first, then due date (no date last), then priority", () => {
    const list = sortTodos([
      todo({ id: "done", status: "done", due_date: "2026-10-01", completed_at: "x" }),
      todo({ id: "nodate-high", priority: "high" }),
      todo({ id: "late-low", due_date: "2026-10-20", priority: "low" }),
      todo({ id: "soon-low", due_date: "2026-10-12", priority: "low" }),
      todo({ id: "soon-high", due_date: "2026-10-12", priority: "high" }),
    ]);
    expect(list.map((t) => t.id)).toEqual([
      "soon-high",
      "soon-low",
      "late-low",
      "nodate-high",
      "done",
    ]);
  });
});

describe("todo filters", () => {
  const today = "2026-10-11";
  const items = [
    todo({ id: "overdue", due_date: "2026-10-09" }),
    todo({ id: "today", due_date: today }),
    todo({ id: "in2", due_date: "2026-10-13", subject_id: "s2", category_id: "c1" }),
    todo({ id: "in5", due_date: "2026-10-16" }),
    todo({ id: "done", due_date: today, status: "done", completed_at: "2026-10-11T03:00:00Z" }),
  ];

  it("detects overdue and due-soon (3 days incl. today)", () => {
    expect(isOverdue(items[0], today)).toBe(true);
    expect(isDueSoon(items[1], today)).toBe(true);
    expect(isDueSoon(items[2], today)).toBe(true);
    expect(isDueSoon(items[3], today)).toBe(false);
    expect(isOverdue(items[4], today)).toBe(false);
  });

  it("filters by status, date, subject and category", () => {
    const ids = (f: Parameters<typeof filterTodos>[1], o = {}) =>
      filterTodos(items, f, today, o).map((t) => t.id);
    expect(ids("today")).toEqual(["today", "done"]);
    expect(ids("open")).toEqual(["overdue", "today", "in2", "in5"]);
    expect(ids("done")).toEqual(["done"]);
    expect(ids("due-soon")).toEqual(["today", "in2"]);
    expect(ids("overdue")).toEqual(["overdue"]);
    expect(ids("all", { subjectId: "s2" })).toEqual(["in2"]);
    expect(ids("all", { categoryId: "none" })).toHaveLength(4);
  });

  it("computes per-subject progress from todo status", () => {
    const p = progressBySubject(items);
    expect(p.get("s1")).toEqual({ done: 1, total: 4, percent: 25 });
    expect(p.get("s2")).toEqual({ done: 0, total: 1, percent: 0 });
  });
});

describe("groupBySubject", () => {
  const subject = (id: string, sort_order: number): Subject => ({
    id,
    user_id: "u",
    name: id,
    description: null,
    color: "#000000",
    weekly_goal_minutes: 0,
    is_archived: false,
    sort_order,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
  });

  it("follows the subject order and keeps each group's todo order", () => {
    const todos = [
      todo({ id: "a1", subject_id: "A" }),
      todo({ id: "b1", subject_id: "B" }),
      todo({ id: "a2", subject_id: "A" }),
      todo({ id: "x1", subject_id: "gone" }),
    ];
    const groups = groupBySubject(todos, [subject("B", 0), subject("A", 1), subject("C", 2)]);
    expect(groups.map((g) => [g.subjectId, g.todos.map((t) => t.id)])).toEqual([
      ["B", ["b1"]],
      ["A", ["a1", "a2"]],
      ["gone", ["x1"]],
    ]);
    expect(groups[2].subject).toBeUndefined();
  });

  it("returns nothing for no todos", () => {
    expect(groupBySubject([], [subject("A", 0)])).toEqual([]);
  });
});
