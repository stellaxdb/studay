import { describe, expect, it } from "vitest";
import {
  aggregateStudy,
  completionsByDay,
  dueCompletionRate,
  sumBySubject,
  sumDays,
} from "@/lib/stats";
import { eventDays } from "@/lib/events";
import { computeElapsedSeconds } from "@/lib/timer";
import { filterTodos, isDueSoon, isOverdue, progressBySubject, sortTodos } from "@/lib/todos";
import type { Todo } from "@/lib/types";

function todo(partial: Partial<Todo>): Todo {
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

describe("computeElapsedSeconds", () => {
  it("sums closed segments and the open segment up to now", () => {
    const now = new Date("2026-10-11T01:00:00Z").getTime();
    const elapsed = computeElapsedSeconds(
      [
        { started_at: "2026-10-11T00:00:00Z", ended_at: "2026-10-11T00:10:00Z" },
        { started_at: "2026-10-11T00:30:00Z", ended_at: "2026-10-11T00:40:00Z" },
        { started_at: "2026-10-11T00:50:00Z", ended_at: null },
      ],
      now,
    );
    expect(elapsed).toBe(30 * 60);
  });

  it("does not count paused time and never goes negative", () => {
    const now = new Date("2026-10-11T00:00:00Z").getTime();
    expect(
      computeElapsedSeconds([{ started_at: "2026-10-11T00:00:05Z", ended_at: null }], now),
    ).toBe(0);
  });
});

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

describe("study statistics", () => {
  const tz = "Asia/Seoul";
  const stats = aggregateStudy(
    [
      // 23:00 → 01:00 KST across midnight, subject A
      { subject_id: "A", started_at: "2026-10-11T14:00:00Z", ended_at: "2026-10-11T16:00:00Z" },
      // 10:00 → 10:30 KST on the 12th, subject B
      { subject_id: "B", started_at: "2026-10-12T01:00:00Z", ended_at: "2026-10-12T01:30:00Z" },
    ],
    tz,
  );

  it("splits time at midnight in the user's timezone", () => {
    expect(stats.byDay.get("2026-10-11")).toBe(3600);
    expect(stats.byDay.get("2026-10-12")).toBe(3600 + 1800);
  });

  it("total equals the sum of subject times (no double counting)", () => {
    const days = ["2026-10-11", "2026-10-12"];
    const bySubject = sumBySubject(stats, days);
    expect(bySubject.get("A")).toBe(7200);
    expect(bySubject.get("B")).toBe(1800);
    expect(sumDays(stats, days)).toBe(7200 + 1800);
  });

  it("counts completions by completed_at day and due-date completion rate", () => {
    const list = [
      todo({ status: "done", completed_at: "2026-10-11T15:30:00Z", due_date: "2026-10-12" }),
      todo({ due_date: "2026-10-12" }),
      todo({ due_date: "2026-11-01" }),
    ];
    expect(completionsByDay(list, tz).get("2026-10-12")).toBe(1);
    expect(dueCompletionRate(list, "2026-10-06", "2026-10-12")).toEqual({
      done: 1,
      total: 2,
      percent: 50,
    });
  });
});

describe("eventDays", () => {
  const base = {
    id: "e",
    user_id: "u",
    subject_id: null,
    title: "e",
    event_type: "exam" as const,
    all_day: false,
    note: null,
    created_at: "",
    updated_at: "",
  };
  it("places an event on its start day in the user's timezone", () => {
    expect(
      eventDays({ ...base, starts_at: "2026-10-11T15:30:00Z", ends_at: null }, "Asia/Seoul"),
    ).toEqual(["2026-10-12"]);
  });
  it("spans multi-day events but not the day it ends at midnight", () => {
    expect(
      eventDays(
        { ...base, starts_at: "2026-10-11T00:00:00Z", ends_at: "2026-10-12T15:00:00Z" },
        "Asia/Seoul",
      ),
    ).toEqual(["2026-10-11", "2026-10-12"]);
  });
});
