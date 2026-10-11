"use client";

import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "./cn";

type ToastTone = "success" | "error";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string, action?: ToastItem["action"]) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string, action?: ToastItem["action"]) => {
      const id = nextId.current++;
      // The same message replaces itself instead of stacking up.
      setItems((list) => [
        ...list.filter((t) => t.message !== message).slice(-1),
        { id, tone, message, action },
      ]);
      // Errors with a retry action stay until dismissed or used.
      if (!action) setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m, a) => push("error", m, a),
    }),
    [push],
  );

  return (
    <ToastContext value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 md:right-6 md:bottom-6 md:left-auto md:items-end"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl px-4 py-3 text-sm text-white",
              "bg-fg",
            )}
          >
            {t.tone === "success" ? (
              <CheckCircle2 aria-hidden className="size-4 shrink-0 text-[#7ee2b8]" />
            ) : (
              <AlertCircle aria-hidden className="size-4 shrink-0 text-[#ff9b9b]" />
            )}
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-1 font-semibold text-[#c9c2ff] hover:bg-white/10"
                onClick={() => {
                  dismiss(t.id);
                  t.action?.onClick();
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="알림 닫기"
              className="shrink-0 rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => dismiss(t.id)}
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
