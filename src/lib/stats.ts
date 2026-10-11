import { dayKey, splitIntervalByDay } from "@/lib/time";
import type { StudyInterval, Todo } from "@/lib/types";

/** Seconds studied per day and per subject, split at midnight in `timeZone`. */
export interface StudyStats {
  /** dayKey -> seconds */
  byDay: Map<string, number>;
  /** dayKey -> subjectId -> seconds */
  byDaySubject: Map<string, Map<string, number>>;
}

export function aggregateStudy(intervals: StudyInterval[], timeZone: string): StudyStats {
  const byDayMs = new Map<string, number>();
  const byDaySubjectMs = new Map<string, Map<string, number>>();

  for (const iv of intervals) {
    for (const [key, ms] of splitIntervalByDay(iv.started_at, iv.ended_at, timeZone)) {
      byDayMs.set(key, (byDayMs.get(key) ?? 0) + ms);
      const subjects = byDaySubjectMs.get(key) ?? new Map<string, number>();
      subjects.set(iv.subject_id, (subjects.get(iv.subject_id) ?? 0) + ms);
      byDaySubjectMs.set(key, subjects);
    }
  }

  const toSeconds = (ms: number) => Math.floor(ms / 1000);
  const byDay = new Map([...byDayMs].map(([k, ms]) => [k, toSeconds(ms)] as const));
  const byDaySubject = new Map(
    [...byDaySubjectMs].map(
      ([k, m]) => [k, new Map([...m].map(([s, ms]) => [s, toSeconds(ms)] as const))] as const,
    ),
  );
  return { byDay, byDaySubject };
}

/** Total seconds over the given day keys. */
export function sumDays(stats: StudyStats, days: string[]): number {
  return days.reduce((sum, d) => sum + (stats.byDay.get(d) ?? 0), 0);
}

/** subjectId -> seconds over the given day keys. */
export function sumBySubject(stats: StudyStats, days: string[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const d of days) {
    const subjects = stats.byDaySubject.get(d);
    if (!subjects) continue;
    for (const [id, s] of subjects) result.set(id, (result.get(id) ?? 0) + s);
  }
  return result;
}

/** TODOs completed on each day (by completed_at in `timeZone`). */
export function completionsByDay(todos: Todo[], timeZone: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const t of todos) {
    if (t.status !== "done" || !t.completed_at) continue;
    const key = dayKey(t.completed_at, timeZone);
    result.set(key, (result.get(key) ?? 0) + 1);
  }
  return result;
}

/**
 * Completion rate of TODOs whose due date falls in [startKey, endKey].
 * Separate from study time on purpose: the two metrics measure different things.
 */
export function dueCompletionRate(
  todos: Todo[],
  startKey: string,
  endKey: string,
): { done: number; total: number; percent: number | null } {
  const due = todos.filter((t) => t.due_date && t.due_date >= startKey && t.due_date <= endKey);
  const done = due.filter((t) => t.status === "done").length;
  return {
    done,
    total: due.length,
    percent: due.length === 0 ? null : Math.round((done / due.length) * 100),
  };
}
