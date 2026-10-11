import { describe, expect, it } from "vitest";
import {
  aggregateStudy,
  completionsByDay,
  dueCompletionRate,
  sumBySubject,
  sumDays,
} from "@/lib/stats";
import { todo } from "@/test/factories";

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
