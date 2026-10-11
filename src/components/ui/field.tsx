import { useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn";

const CONTROL =
  "rounded-[var(--radius-control)] border border-border-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-tertiary transition-colors duration-150 hover:border-fg-tertiary focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 disabled:bg-surface-subtle disabled:text-fg-tertiary aria-[invalid=true]:border-danger";

export interface FieldProps {
  label: string;
  /** Shown next to the label, e.g. "선택" */
  optional?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

/** Label + control + hint/error, with ids wired for screen readers. */
export function Field({ label, optional, hint, error, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-fg text-sm font-medium">
        {label}
        {optional && <span className="text-fg-tertiary ml-1 text-xs font-normal">선택</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-fg-tertiary text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-danger text-xs font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

/** Full width unless the caller sets its own width (w-*). */
function width(className?: string) {
  return /(^|\s)w-/.test(className ?? "") ? "" : "w-full";
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, width(className), "h-10", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CONTROL, width(className), "h-10 pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(CONTROL, width(className), "min-h-20 py-2", className)} {...props} />
  );
}
