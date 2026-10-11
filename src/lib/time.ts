import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

/** "YYYY-MM-DD" key of the calendar day that `date` falls on in `timeZone`. */
export function dayKey(date: Date | number | string, timeZone: string): string {
  return format(new TZDate(new Date(date).getTime(), timeZone), "yyyy-MM-dd");
}

export function parseDayKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

/** The instant at which the given day starts in `timeZone`. */
export function startOfDayKey(key: string, timeZone: string): Date {
  const { year, month, day } = parseDayKey(key);
  return new Date(new TZDate(year, month - 1, day, timeZone).getTime());
}

/** Calendar arithmetic on day keys (timezone independent). */
export function addDaysToKey(key: string, days: number): string {
  const { year, month, day } = parseDayKey(key);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOfKey(key: string): number {
  const { year, month, day } = parseDayKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function diffDays(fromKey: string, toKey: string): number {
  const a = parseDayKey(fromKey);
  const b = parseDayKey(toKey);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000,
  );
}

export function startOfWeekKey(key: string, weekStartsOn: number): string {
  const offset = (weekdayOfKey(key) - weekStartsOn + 7) % 7;
  return addDaysToKey(key, -offset);
}

export function daysInRange(startKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDaysToKey(startKey, i));
}

/**
 * Splits [start, end) into per-day durations (milliseconds) using day
 * boundaries in `timeZone`. A session that crosses midnight is credited to
 * both days.
 */
export function splitIntervalByDay(
  start: Date | string,
  end: Date | string,
  timeZone: string,
): Map<string, number> {
  const result = new Map<string, number>();
  let cursor = new Date(start).getTime();
  const stop = new Date(end).getTime();
  // Guard against malformed data.
  let guard = 0;
  while (cursor < stop && guard < 400) {
    const key = dayKey(cursor, timeZone);
    const nextDayStart = startOfDayKey(addDaysToKey(key, 1), timeZone).getTime();
    const chunkEnd = Math.min(stop, nextDayStart);
    result.set(key, (result.get(key) ?? 0) + (chunkEnd - cursor));
    cursor = chunkEnd;
    guard += 1;
  }
  return result;
}

/** Month grid (6 rows × 7 days) of day keys for the month containing `monthKey`. */
export function monthGrid(monthKey: string, weekStartsOn: number): string[] {
  const { year, month } = parseDayKey(monthKey);
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const gridStart = startOfWeekKey(first, weekStartsOn);
  return daysInRange(gridStart, 42);
}

export function addMonthsToKey(key: string, months: number): string {
  const { year, month } = parseDayKey(key);
  const d = new Date(Date.UTC(year, month - 1 + months, 1));
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** "1시간 5분", "45분", "0분" */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/** "01:02:03" — used by the timer. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS[weekday];
}

/** "10월 11일 (일)" */
export function formatDayLabel(key: string, withWeekday = true): string {
  const { month, day } = parseDayKey(key);
  return withWeekday
    ? `${month}월 ${day}일 (${WEEKDAYS[weekdayOfKey(key)]})`
    : `${month}월 ${day}일`;
}

/** "오후 3:05" in the user's timezone. */
export function formatTime(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(date));
}

/** "HH:mm" (24h) in timeZone — used to prefill <input type="time">. */
export function timeInputValue(date: Date | string, timeZone: string): string {
  return format(new TZDate(new Date(date).getTime(), timeZone), "HH:mm");
}

/** Combines a day key and "HH:mm" in `timeZone` into an absolute Date. */
export function zonedDateTime(key: string, time: string, timeZone: string): Date {
  const { year, month, day } = parseDayKey(key);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(year, month - 1, day, hh, mm, timeZone).getTime());
}

/** Human label for a due date relative to today: "오늘", "내일", "3일 지남", "10월 20일". */
export function relativeDueLabel(dueKey: string, todayKey: string): string {
  const diff = diffDays(todayKey, dueKey);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff < 0) return `${-diff}일 지남`;
  if (diff < 7) return `${diff}일 남음`;
  return formatDayLabel(dueKey, false);
}
