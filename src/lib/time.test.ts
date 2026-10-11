import { describe, expect, it } from "vitest";
import {
  addDaysToKey,
  dayKey,
  diffDays,
  formatClock,
  formatDuration,
  monthGrid,
  relativeDueLabel,
  splitIntervalByDay,
  startOfDayKey,
  startOfWeekKey,
  zonedDateTime,
} from "@/lib/time";

const SEOUL = "Asia/Seoul";
const NY = "America/New_York";

describe("dayKey / startOfDayKey", () => {
  it("uses the user's timezone, not UTC", () => {
    // 2026-10-11 23:30 KST is still 2026-10-11 14:30 UTC
    expect(dayKey("2026-10-11T14:30:00Z", SEOUL)).toBe("2026-10-11");
    // 2026-10-11 15:30 UTC is already 10-12 00:30 in Seoul
    expect(dayKey("2026-10-11T15:30:00Z", SEOUL)).toBe("2026-10-12");
  });

  it("returns the instant a day starts in the timezone", () => {
    expect(startOfDayKey("2026-10-12", SEOUL).toISOString()).toBe("2026-10-11T15:00:00.000Z");
  });
});

describe("splitIntervalByDay", () => {
  it("credits a session crossing midnight to both days", () => {
    // 23:30 → 00:45 KST
    const parts = splitIntervalByDay("2026-10-11T14:30:00Z", "2026-10-11T15:45:00Z", SEOUL);
    expect(parts.get("2026-10-11")).toBe(30 * 60 * 1000);
    expect(parts.get("2026-10-12")).toBe(45 * 60 * 1000);
  });

  it("keeps a same-day session in one bucket", () => {
    const parts = splitIntervalByDay("2026-10-11T01:00:00Z", "2026-10-11T02:00:00Z", SEOUL);
    expect([...parts.entries()]).toEqual([["2026-10-11", 3_600_000]]);
  });

  it("handles a DST transition day (23-hour day)", () => {
    // 2026-03-08 is a 23-hour day in New York.
    const start = startOfDayKey("2026-03-08", NY);
    const end = startOfDayKey("2026-03-09", NY);
    const parts = splitIntervalByDay(start, end, NY);
    expect(parts.get("2026-03-08")).toBe(23 * 3_600_000);
    expect(parts.size).toBe(1);
  });

  it("ignores empty or reversed intervals", () => {
    expect(splitIntervalByDay("2026-10-11T02:00:00Z", "2026-10-11T01:00:00Z", SEOUL).size).toBe(0);
  });
});

describe("day key arithmetic", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("computes week start for Monday- and Sunday-first weeks", () => {
    // 2026-10-11 is a Sunday
    expect(startOfWeekKey("2026-10-11", 1)).toBe("2026-10-05");
    expect(startOfWeekKey("2026-10-11", 0)).toBe("2026-10-11");
  });

  it("builds a 42-day month grid starting on the week start", () => {
    const grid = monthGrid("2026-10-01", 1);
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-09-28");
    expect(grid).toContain("2026-10-31");
  });

  it("diffs days", () => {
    expect(diffDays("2026-10-11", "2026-10-14")).toBe(3);
    expect(diffDays("2026-10-11", "2026-10-09")).toBe(-2);
  });
});

describe("formatting", () => {
  it("formats durations in Korean", () => {
    expect(formatDuration(0)).toBe("0분");
    expect(formatDuration(45 * 60)).toBe("45분");
    expect(formatDuration(3600)).toBe("1시간");
    expect(formatDuration(3600 + 5 * 60 + 59)).toBe("1시간 5분");
  });

  it("formats a clock with fixed width", () => {
    expect(formatClock(0)).toBe("00:00:00");
    expect(formatClock(3725)).toBe("01:02:05");
  });

  it("labels due dates relative to today", () => {
    expect(relativeDueLabel("2026-10-11", "2026-10-11")).toBe("오늘");
    expect(relativeDueLabel("2026-10-12", "2026-10-11")).toBe("내일");
    expect(relativeDueLabel("2026-10-08", "2026-10-11")).toBe("3일 지남");
    expect(relativeDueLabel("2026-10-30", "2026-10-11")).toBe("10월 30일");
  });

  it("combines a date and time in a timezone", () => {
    expect(zonedDateTime("2026-10-11", "09:30", SEOUL).toISOString()).toBe(
      "2026-10-11T00:30:00.000Z",
    );
  });
});
