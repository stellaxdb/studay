import {
  BarChart3,
  BookOpen,
  CalendarDays,
  House,
  ListChecks,
  Settings,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: "/" | "/todos" | "/subjects" | "/focus" | "/calendar" | "/analytics" | "/settings";
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "홈", icon: House },
  { href: "/todos", label: "할 일", icon: ListChecks },
  { href: "/subjects", label: "과목", icon: BookOpen },
  { href: "/focus", label: "공부 타이머", icon: Timer },
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/analytics", label: "학습 분석", icon: BarChart3 },
];

export const SECONDARY_NAV: NavItem[] = [{ href: "/settings", label: "설정", icon: Settings }];
