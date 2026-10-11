// Row types mirroring supabase/migrations. Timestamps arrive as ISO strings.

export type Priority = "high" | "medium" | "low";
export type TodoStatus = "todo" | "done";
export type EventType = "exam" | "class" | "assignment" | "personal" | "other";
export type SessionStatus = "running" | "paused" | "completed";

export interface UserSettings {
  user_id: string;
  display_name: string | null;
  timezone: string;
  daily_goal_minutes: number;
  /** 0 = Sunday … 6 = Saturday */
  week_starts_on: number;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  weekly_goal_minutes: number;
  is_archived: boolean;
  /** Manual order on the 과목 screen (0 = first). */
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  subject_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  subject_id: string;
  category_id: string | null;
  title: string;
  note: string | null;
  status: TodoStatus;
  priority: Priority;
  /** Calendar date "YYYY-MM-DD" (no time component). */
  due_date: string | null;
  estimated_minutes: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  event_type: EventType;
  all_day: boolean;
  starts_at: string;
  ends_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudySegment {
  id: string;
  session_id: string;
  started_at: string;
  ended_at: string | null;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject_id: string;
  todo_id: string | null;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  total_seconds: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActiveSession extends StudySession {
  study_segments: StudySegment[];
}

/** A segment joined with its session's subject, used for statistics. */
export interface StudyInterval {
  subject_id: string;
  started_at: string;
  ended_at: string;
}
