"use client";

import { useEffect, useState } from "react";
import { useActiveSession, useSettings } from "@/lib/data/queries";
import { addDaysToKey, dayKey, daysInRange, startOfDayKey, startOfWeekKey } from "@/lib/time";
import { computeElapsedSeconds } from "@/lib/timer";

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
  } catch {
    return "Asia/Seoul";
  }
}

/** The user's configured timezone (falls back to the browser's). */
export function useTimeZone(): string {
  const { data } = useSettings();
  return data?.timezone ?? browserTimeZone();
}

/** Current time that re-renders every `intervalMs`. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    // Catch up immediately when the tab becomes visible again.
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
  return now;
}

/** Today's day key in the user's timezone; rolls over at midnight. */
export function useToday(): string {
  const timeZone = useTimeZone();
  const now = useNow(30_000);
  return dayKey(now, timeZone);
}

/**
 * Live elapsed seconds of the active session. Derived from stored segment
 * timestamps + server clock offset, never from an accumulating counter, so
 * background tabs, sleep and refreshes do not drift.
 */
export function useActiveElapsed() {
  const query = useActiveSession();
  const session = query.data?.session ?? null;
  const offset = query.data?.clockOffsetMs ?? 0;
  const now = useNow(session?.status === "running" ? 1000 : 60_000);
  const elapsed = session ? computeElapsedSeconds(session.study_segments, now + offset) : 0;
  return { ...query, session, elapsed };
}

/** Current week (per user setting) as day keys and an ISO [from, to) range. */
export function useWeek() {
  const timeZone = useTimeZone();
  const today = useToday();
  const { data: settings } = useSettings();
  const start = startOfWeekKey(today, settings?.week_starts_on ?? 1);
  return {
    today,
    timeZone,
    days: daysInRange(start, 7),
    from: startOfDayKey(start, timeZone).toISOString(),
    to: startOfDayKey(addDaysToKey(start, 7), timeZone).toISOString(),
  };
}
