import { AlertCircle, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";

export function LoadingState({
  label = "불러오는 중이에요",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "text-fg-secondary flex items-center justify-center gap-2 py-10 text-sm",
        className,
      )}
    >
      <Loader2 aria-hidden className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {Icon && (
        <span className="bg-surface-subtle text-fg-secondary mb-3 flex size-10 items-center justify-center rounded-full">
          <Icon aria-hidden className="size-5" />
        </span>
      )}
      <p className="text-fg text-sm font-semibold">{title}</p>
      {description && <p className="text-fg-secondary mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = "데이터를 불러오지 못했어요.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}
    >
      <AlertCircle aria-hidden className="text-danger size-5" />
      <p className="text-fg text-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}
