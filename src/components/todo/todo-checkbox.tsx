"use client";

import { Check } from "lucide-react";
import { cn } from "@/components/ui/cn";

export function TodoCheckbox({
  checked,
  label,
  disabled,
  onToggle,
}: {
  checked: boolean;
  /** e.g. "PA1 미니쉘 완료" */
  label: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      // 32px hit target around an 20px box
      className="group -m-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg disabled:cursor-wait"
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-md border transition-colors duration-150",
          checked
            ? "border-success bg-success text-white"
            : "border-border-strong bg-surface group-hover:border-fg-tertiary",
          disabled && "opacity-60",
        )}
      >
        {checked && <Check aria-hidden className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}
