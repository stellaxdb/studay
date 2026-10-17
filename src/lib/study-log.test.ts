import { describe, expect, it } from "vitest";
import { aggregateStudy } from "@/lib/stats";
import {
  dailyRows,
  logPeriod,
  parseLogParams,
  sessionsInRange,
  type SessionWithSegments,
} from "@/lib/study-log";

describe("parseLogParams", () => {
  const today = "2026-10-17";
  it("accepts valid units and past dates", () => {
    expect(parseLogParams("month", "2026-09-03", today)).toEqual({
      unit: "month",
      anchor: "2026-09-03",
    });
  });
  it("falls back to this week for invalid, impossible or future values", () => {
    expect(parseLogParams("year", "2026-02-30", today)).toEqual({ unit: "week", anchor: today });
    expect(parseLogParams(null, "2026-10-18", today)).toEqual({ unit: "week", anchor: today });
    expect(parseLogParams("day", "abc", today)).toEqual({ unit: "day", anchor: today });
  });
});

describe("logPeriod", () => {
  const today = "2026-10-17"; // Saturday

  it("builds the current week from the user's week start and blocks the future", () => {
    const mon = logPeriod("week", today, today, 1);
    expect(mon.days[0]).toBe("2026-10-12");
    expect(mon.days[6]).toBe("2026-10-18");
    expect(mon.label).toBe("10월 12일 ~ 18일");
    expect(mon.next).toBeNull();
    expect(mon.prev).toBe("2026-10-05");
    expect(mon.isCurrent).toBe(true);
    expect(mon.elapsedDays).toBe(6);

    const sun = logPeriod("week", today, today, 0);
    expect(sun.days[0]).toBe("2026-10-11");
    expect(sun.elapsedDays).toBe(7);
  });

  it("labels weeks that cross a month or a year", () => {
    expect(logPeriod("week", "2026-09-30", today, 1).label).toBe("9월 28일 ~ 10월 4일");
    expect(logPeriod("week", "2025-12-30", today, 1).label).toBe(
      "2025년 12월 29일 ~ 2026년 1월 4일",
    );
  });

  it("covers whole months including leap-year February", () => {
    const feb = logPeriod("month", "2028-02-15", "2028-03-10", 1);
    expect(feb.days).toHaveLength(29);
    expect(feb.days[28]).toBe("2028-02-29");
    expect(feb.label).toBe("2028년 2월");
    expect(feb.next).toBe("2028-03-01");
    expect(feb.elapsedDays).toBe(29);
    expect(logPeriod("month", "2026-02-01", today, 1).days).toHaveLength(28);

    const dec = logPeriod("month", "2025-12-31", today, 1);
    expect(dec.days).toHaveLength(31);
    expect(dec.next).toBe("2026-01-01");
    expect(dec.prev).toBe("2025-11-01");

    const oct = logPeriod("month", today, today, 1);
    expect(oct.next).toBeNull();
    expect(oct.elapsedDays).toBe(17);
  });

  it("moves single days and clamps a future anchor to today", () => {
    const day = logPeriod("day", "2026-03-01", today, 1);
    expect(day.prev).toBe("2026-02-28");
    expect(day.label).toBe("3월 1일 (일)");
    expect(logPeriod("day", "2026-10-20", today, 1).start).toBe(today);
  });
});

describe("dailyRows", () => {
  it("credits a session across midnight to both days, most studied subject first", () => {
    const stats = aggregateStudy(
      [
        // 23:30 → 00:30 KST
        { subject_id: "A", started_at: "2026-10-16T14:30:00Z", ended_at: "2026-10-16T15:30:00Z" },
        // 09:00 → 10:00 KST on the 17th
        { subject_id: "B", started_at: "2026-10-17T00:00:00Z", ended_at: "2026-10-17T01:00:00Z" },
      ],
      "Asia/Seoul",
    );
    const rows = dailyRows(stats, ["2026-10-16", "2026-10-17", "2026-10-18"]);
    expect(rows[0]).toEqual({ day: "2026-10-16", total: 1800, subjects: [["A", 1800]] });
    expect(rows[1]).toEqual({
      day: "2026-10-17",
      total: 5400,
      subjects: [
        ["B", 3600],
        ["A", 1800],
      ],
    });
    expect(rows[2]).toEqual({ day: "2026-10-18", total: 0, subjects: [] });
  });
});

describe("sessionsInRange", () => {
  const session = (
    id: string,
    started_at: string,
    ended_at: string,
    segments: [string, string][],
  ): SessionWithSegments => ({
    id,
    user_id: "u",
    subject_id: "A",
    todo_id: null,
    status: "completed",
    started_at,
    ended_at,
    total_seconds: 0,
    note: null,
    created_at: started_at,
    updated_at: started_at,
    study_segments: segments.map(([s, e]) => ({ started_at: s, ended_at: e })),
  });
  // 2026-10-17 in KST
  const from = "2026-10-16T15:00:00.000Z";
  const to = "2026-10-17T15:00:00.000Z";

  it("excludes pauses and keeps only the day's share of a session across midnight", () => {
    const entries = sessionsInRange(
      [
        // 14:05 → 14:45 KST with a 10 min pause
        session("s1", "2026-10-17T05:05:00Z", "2026-10-17T05:45:00Z", [
          ["2026-10-17T05:05:00Z", "2026-10-17T05:20:00Z"],
          ["2026-10-17T05:30:00Z", "2026-10-17T05:45:00Z"],
        ]),
        // 23:20 (16th) → 00:10 (17th) KST
        session("s2", "2026-10-16T14:20:00Z", "2026-10-16T15:10:00Z", [
          ["2026-10-16T14:20:00Z", "2026-10-16T15:10:00Z"],
        ]),
        // Another day entirely
        session("s3", "2026-10-15T01:00:00Z", "2026-10-15T02:00:00Z", [
          ["2026-10-15T01:00:00Z", "2026-10-15T02:00:00Z"],
        ]),
      ],
      from,
      to,
    );
    expect(entries.map((e) => e.session.id)).toEqual(["s1", "s2"]);
    expect(entries[0]).toMatchObject({
      studiedSeconds: 30 * 60,
      pausedSeconds: 10 * 60,
      startedBefore: false,
      endsAfter: false,
    });
    expect(entries[1]).toMatchObject({
      start: from,
      studiedSeconds: 10 * 60,
      pausedSeconds: 0,
      startedBefore: true,
    });
  });
});
