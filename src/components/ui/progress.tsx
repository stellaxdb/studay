import { cn } from "./cn";

export function ProgressBar({
  value,
  max = 100,
  label,
  color,
  className,
}: {
  value: number;
  max?: number;
  /** Accessible name, e.g. "운영체제 진행률" */
  label: string;
  color?: string;
  className?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={cn("bg-surface-subtle h-1.5 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className="bg-primary h-full rounded-full transition-[width] duration-200"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
