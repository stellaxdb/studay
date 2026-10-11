import { BookMarked, CalendarClock, ClipboardList, GraduationCap, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { addDaysToKey, dayKey } from "@/lib/time";
import type { CalendarEvent, EventType } from "@/lib/types";

export const EVENT_TYPES: { value: EventType; label: string; icon: LucideIcon }[] = [
  { value: "exam", label: "시험", icon: GraduationCap },
  { value: "class", label: "수업", icon: BookMarked },
  { value: "assignment", label: "과제", icon: ClipboardList },
  { value: "personal", label: "개인 일정", icon: User },
  { value: "other", label: "기타", icon: CalendarClock },
];

export const EVENT_TYPE_MAP = new Map(EVENT_TYPES.map((t) => [t.value, t]));

/** Day keys an event covers (start day through end day, capped at 31 days). */
export function eventDays(event: CalendarEvent, timeZone: string): string[] {
  const start = dayKey(event.starts_at, timeZone);
  if (!event.ends_at) return [start];
  // An event ending exactly at midnight does not occupy the next day.
  const endInstant = new Date(new Date(event.ends_at).getTime() - 1);
  const end = endInstant < new Date(event.starts_at) ? start : dayKey(endInstant, timeZone);
  const days = [start];
  let cursor = start;
  while (cursor < end && days.length < 31) {
    cursor = addDaysToKey(cursor, 1);
    days.push(cursor);
  }
  return days;
}
