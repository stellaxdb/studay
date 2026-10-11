"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";

/**
 * Modal built on the native <dialog> element: focus is trapped, Esc closes,
 * and focus returns to the opener automatically.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop closes the dialog.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "bg-surface text-fg m-auto w-[calc(100%-2rem)] rounded-[var(--radius-dialog)] p-0 shadow-[0_8px_24px_rgb(25_31_40/0.08)]",
        size === "sm" ? "max-w-sm" : "max-w-lg",
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-2">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description && (
                <div id={descId} className="text-fg-secondary mt-1 text-sm">
                  {description}
                </div>
              )}
            </div>
            <Button variant="tertiary" size="icon-sm" aria-label="닫기" onClick={onClose}>
              <X aria-hidden className="size-4" />
            </Button>
          </div>
          {children && <div className="overflow-y-auto px-5 py-3">{children}</div>}
          {footer && (
            <div className="border-border flex flex-wrap justify-end gap-2 border-t px-5 py-4">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
