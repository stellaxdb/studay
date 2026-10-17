import type { StudyStats } from "@/lib/stats";
import {
  addDaysToKey,
  addMonthsToKey,
  daysInRange,
  diffDays,
  formatDayLabel,
  parseDayKey,
  startOfWeekKey,
} from "@/lib/time";
import type { StudySegment, StudySession } from "@/lib/types";

/** Period unit of the study log on the analytics screen. */
export type LogUnit = "day" | "week" | "month";

export const LOG_UNITS: LogUnit[] = ["day", "week", "month"];

export interface LogPeriod {
  unit: LogUnit;
  /** First day of the period (also the value kept in the URL). */
  start: string;
  days: string[];
  label: string;
  /** Start key of the previous period. */
  prev: string;
  /** Start key of the next period, or null when it would be in the future. */
  next: string | null;
  /** True when the period contains today. */
  isCurrent: boolean;
  /** Days of the period up to and including today (used for averages). */
  elapsedDays: number;
}

function isDayKey(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Rejects impossible dates such as 2026-02-30 (round trip changes them).
  return addDaysToKey(value, 0) === value;
}

/** Reads `?view=&date=` safely; anything invalid falls back to this week. */
export function parseLogParams(
  view: string | null,
  date: string | null,
  today: string,
): { unit: LogUnit; anchor: string } {
  const unit = LOG_UNITS.includes(view as LogUnit) ? (view as LogUnit) : "week";
  const anchor = isDayKey(date) && date <= today ? date : today;
  return { unit, anchor };
}

function periodStart(unit: LogUnit, key: string, weekStartsOn: number): string {
  if (unit === "day") return key;
  if (unit === "week") return startOfWeekKey(key, weekStartsOn);
  return `${key.slice(0, 7)}-01`;
}

function periodDays(unit: LogUnit, start: string): string[] {
  if (unit === "day") return [start];
  if (unit === "week") return daysInRange(start, 7);
  return daysInRange(start, diffDays(start, addMonthsToKey(start, 1)));
}

function rangeLabel(first: string, last: string): string {
  const a = parseDayKey(first);
  const b = parseDayKey(last);
  if (a.year !== b.year) {
    return `${a.year}년 ${a.month}월 ${a.day}일 ~ ${b.year}년 ${b.month}월 ${b.day}일`;
  }
  if (a.month !== b.month) return `${a.month}월 ${a.day}일 ~ ${b.month}월 ${b.day}일`;
  return `${a.month}월 ${a.day}일 ~ ${b.day}일`;
}

/** The day, week (per the user's week start) or month containing `anchor`. */
export function logPeriod(
  unit: LogUnit,
  anchor: string,
  today: string,
  weekStartsOn: number,
): LogPeriod {
  const start = periodStart(unit, anchor > today ? today : anchor, weekStartsOn);
  const days = periodDays(unit, start);
  const last = days[days.length - 1];
  const step = (n: number) =>
    unit === "day"
      ? addDaysToKey(start, n)
      : unit === "week"
        ? addDaysToKey(start, 7 * n)
        : addMonthsToKey(start, n);
  const next = step(1);
  const { year, month } = parseDayKey(start);
  return {
    unit,
    start,
    days,
    label:
      unit === "day"
        ? formatDayLabel(start)
        : unit === "week"
          ? rangeLabel(start, last)
          : `${year}년 ${month}월`,
    prev: step(-1),
    next: next > today ? null : next,
    isCurrent: start <= today && today <= last,
    elapsedDays: days.filter((d) => d <= today).length,
  };
}

export interface DayRow {
  day: string;
  total: number;
  /** [subjectId, seconds], most studied first */
  subjects: [string, number][];
}

/** Per-day totals with the subject breakdown, from the shared study stats. */
export function dailyRows(stats: StudyStats, days: string[]): DayRow[] {
  return days.map((day) => {
    const subjects = [...(stats.byDaySubject.get(day) ?? new Map<string, number>())]
      .filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1]);
    return { day, total: stats.byDay.get(day) ?? 0, subjects };
  });
}

export interface SessionWithSegments extends StudySession {
  study_segments: Pick<StudySegment, "started_at" | "ended_at">[];
}

export interface LogEntry {
  session: SessionWithSegments;
  /** Shown start/end, clipped to the range. */
  start: string;
  end: string;
  /** Study time inside the range (pauses excluded). */
  studiedSeconds: number;
  /** Paused time inside the range. */
  pausedSeconds: number;
  /** Session began before the range (e.g. the previous evening). */
  startedBefore: boolean;
  /** Session continued past the range. */
  endsAfter: boolean;
}

/**
 * Completed sessions overlapping [from, to), clipped to the range so a session
 * across midnight shows only that day's share. Newest first.
 */
export function sessionsInRange(
  sessions: SessionWithSegments[],
  from: string,
  to: string,
): LogEntry[] {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const entries: LogEntry[] = [];
  for (const session of sessions) {
    if (!session.ended_at) continue;
    const sessionStart = new Date(session.started_at).getTime();
    const sessionEnd = new Date(session.ended_at).getTime();
    const start = Math.max(fromMs, sessionStart);
    const end = Math.min(toMs, sessionEnd);
    if (end <= start) continue;
    let studiedMs = 0;
    for (const seg of session.study_segments) {
      if (!seg.ended_at) continue;
      const s = Math.max(start, new Date(seg.started_at).getTime());
      const e = Math.min(end, new Date(seg.ended_at).getTime());
      if (e > s) studiedMs += e - s;
    }
    if (studiedMs <= 0) continue;
    entries.push({
      session,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      studiedSeconds: Math.floor(studiedMs / 1000),
      pausedSeconds: Math.floor(Math.max(0, end - start - studiedMs) / 1000),
      startedBefore: sessionStart < fromMs,
      endsAfter: sessionEnd > toMs,
    });
  }
  return entries.sort((a, b) => b.start.localeCompare(a.start));
}
