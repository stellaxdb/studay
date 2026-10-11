import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("border-border bg-surface rounded-[var(--radius-card)] border", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div className="min-w-0">
        <h2 id={id} className="text-fg text-base font-semibold">
          {title}
        </h2>
        {description && <p className="text-fg-secondary mt-0.5 text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
