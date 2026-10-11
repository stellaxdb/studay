"use client";

import useSWR from "swr";
import { getSupabase } from "@/lib/supabase/client";
import type {
  ActiveSession,
  CalendarEvent,
  Category,
  StudyInterval,
  StudySession,
  Subject,
  Todo,
  UserSettings,
} from "@/lib/types";

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
  } catch {
    return "Asia/Seoul";
  }
}

async function fetchSettings(): Promise<UserSettings> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("user_settings").select("*").maybeSingle();
  if (error) throw error;
  if (data) return data as UserSettings;
  // Account created before the migration ran: create defaults once.
  const { data: created, error: insertError } = await supabase
    .from("user_settings")
    .insert({ timezone: browserTimeZone() })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return created as UserSettings;
}

export function useSettings() {
  return useSWR(["settings"], fetchSettings);
}

export function useSubjects() {
  return useSWR(["subjects"], async () => {
    const { data, error } = await getSupabase()
      .from("subjects")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data as Subject[];
  });
}

export function useCategories() {
  return useSWR(["categories"], async () => {
    const { data, error } = await getSupabase()
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data as Category[];
  });
}

export function useTodos() {
  return useSWR(["todos"], async () => {
    const { data, error } = await getSupabase()
      .from("todos")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data as Todo[];
  });
}

/** Independent events overlapping [from, to). */
export function useEvents(from: string | null, to: string | null) {
  return useSWR(from && to ? ["events", from, to] : null, async () => {
    const { data, error } = await getSupabase()
      .from("calendar_events")
      .select("*")
      .lt("starts_at", to!)
      .or(`ends_at.gte.${from},and(ends_at.is.null,starts_at.gte.${from})`)
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return data as CalendarEvent[];
  });
}

interface SegmentRow {
  started_at: string;
  ended_at: string;
  study_sessions: { subject_id: string } | { subject_id: string }[];
}

/**
 * Active intervals of COMPLETED sessions overlapping [from, to), clipped to
 * the range. This is the single source for every study-time statistic.
 */
export function useStudyIntervals(from: string | null, to: string | null) {
  return useSWR(from && to ? ["intervals", from, to] : null, async () => {
    const { data, error } = await getSupabase()
      .from("study_segments")
      .select("started_at, ended_at, study_sessions!inner(subject_id, status)")
      .eq("study_sessions.status", "completed")
      .not("ended_at", "is", null)
      .gt("ended_at", from!)
      .lt("started_at", to!)
      .order("started_at", { ascending: true })
      .limit(5000);
    if (error) throw error;
    const fromMs = new Date(from!).getTime();
    const toMs = new Date(to!).getTime();
    return (data as unknown as SegmentRow[]).map((row): StudyInterval => {
      const session = Array.isArray(row.study_sessions)
        ? row.study_sessions[0]
        : row.study_sessions;
      return {
        subject_id: session.subject_id,
        started_at: new Date(Math.max(fromMs, new Date(row.started_at).getTime())).toISOString(),
        ended_at: new Date(Math.min(toMs, new Date(row.ended_at).getTime())).toISOString(),
      };
    });
  });
}

/** Completed sessions that ended within [from, to), newest first. */
export function useSessions(from: string | null, to: string | null) {
  return useSWR(from && to ? ["sessions", from, to] : null, async () => {
    const { data, error } = await getSupabase()
      .from("study_sessions")
      .select("*")
      .eq("status", "completed")
      .gte("ended_at", from!)
      .lt("ended_at", to!)
      .order("started_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data as StudySession[];
  });
}

export interface ActiveSessionState {
  session: ActiveSession | null;
  /** serverTime - clientTime in ms; add to Date.now() for an accurate "now". */
  clockOffsetMs: number;
}

/** The running/paused session (if any), restored from the database. */
export function useActiveSession() {
  return useSWR<ActiveSessionState>(
    ["active-session"],
    async () => {
      const supabase = getSupabase();
      const t0 = Date.now();
      const [sessionRes, nowRes] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("*, study_segments(id, session_id, started_at, ended_at)")
          .in("status", ["running", "paused"])
          .maybeSingle(),
        supabase.rpc("server_now"),
      ]);
      const t1 = Date.now();
      if (sessionRes.error) throw sessionRes.error;
      let clockOffsetMs = 0;
      if (!nowRes.error && nowRes.data) {
        clockOffsetMs = new Date(nowRes.data as string).getTime() - (t0 + t1) / 2;
      }
      return { session: (sessionRes.data as ActiveSession | null) ?? null, clockOffsetMs };
    },
    { revalidateOnFocus: true, refreshInterval: 60_000 },
  );
}
