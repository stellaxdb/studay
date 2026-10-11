import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "tertiary" | "danger";
type Size = "md" | "sm" | "icon" | "icon-sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover disabled:bg-primary/50",
  secondary:
    "bg-surface text-fg border border-border hover:bg-surface-subtle disabled:text-fg-tertiary",
  tertiary: "text-fg-secondary hover:bg-surface-subtle hover:text-fg disabled:text-fg-tertiary",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50",
};

const SIZES: Record<Size, string> = {
  md: "h-10 px-5 text-sm gap-1.5",
  sm: "h-8 px-3 text-sm gap-1",
  icon: "size-10",
  "icon-sm": "size-8",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-full font-semibold whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
