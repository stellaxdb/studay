"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ColorDot } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { useSubjects } from "@/lib/data/queries";
import { useActiveElapsed } from "@/lib/hooks";
import { formatClock } from "@/lib/time";
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from "./nav-items";

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-medium transition-colors duration-150",
        active
          ? "bg-primary-subtle text-primary"
          : "text-fg-secondary hover:bg-surface-subtle hover:text-fg",
      )}
    >
      <Icon aria-hidden className="size-5" strokeWidth={1.8} />
      {item.label}
    </Link>
  );
}

/** Running/paused timer status, visible on every page. */
function ActiveTimerCard({ onNavigate }: { onNavigate?: () => void }) {
  const { session, elapsed } = useActiveElapsed();
  const { data: subjects } = useSubjects();
  if (!session) return null;
  const subject = subjects?.find((s) => s.id === session.subject_id);
  const running = session.status === "running";
  return (
    <Link
      href="/focus"
      onClick={onNavigate}
      className="border-border bg-surface hover:border-border-strong mx-3 mb-3 block rounded-[var(--radius-control)] border px-3 py-2.5"
    >
      <span className="text-fg-secondary flex items-center gap-1.5 text-xs font-medium">
        <span
          aria-hidden
          className={cn("size-1.5 rounded-full", running ? "bg-primary" : "bg-fg-tertiary")}
        />
        {running ? "공부 중" : "일시정지"}
        {subject && (
          <>
            <span aria-hidden>·</span>
            <ColorDot color={subject.color} />
            <span className="truncate">{subject.name}</span>
          </>
        )}
      </span>
      <span className="tabular text-fg mt-0.5 block text-lg font-semibold">
        {formatClock(elapsed)}
      </span>
    </Link>
  );
}

export function SidebarContent({
  email,
  onSignOut,
  onNavigate,
  showTimer = true,
}: {
  email: string | null;
  onSignOut: () => void;
  onNavigate?: () => void;
  showTimer?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <span
          aria-hidden
          className="bg-primary flex size-7 items-center justify-center rounded-lg text-sm font-bold text-white"
        >
          s
        </span>
        <span className="text-fg text-lg font-bold tracking-tight">studay</span>
      </div>

      <nav aria-label="주 메뉴" className="flex flex-1 flex-col gap-0.5 px-3 pt-2">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>

      {showTimer && <ActiveTimerCard onNavigate={onNavigate} />}

      <nav
        aria-label="계정 메뉴"
        className="border-border flex flex-col gap-0.5 border-t px-3 py-3"
      >
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
        <button
          type="button"
          onClick={onSignOut}
          className="text-fg-secondary hover:bg-surface-subtle hover:text-fg flex h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-medium transition-colors duration-150"
        >
          <LogOut aria-hidden className="size-5" strokeWidth={1.8} />
          로그아웃
        </button>
        {email && <p className="text-fg-tertiary truncate px-3 pt-1 text-xs">{email}</p>}
      </nav>
    </div>
  );
}
