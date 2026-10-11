import Image from "next/image";

// public/logo.png is 210×64 (2× for crisp rendering).
const RATIO = 210 / 64;

/** studay wordmark with symbol. `height` is the rendered height in px. */
export function Logo({ height = 26, className }: { height?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="studay"
      width={Math.round(height * RATIO)}
      height={height}
      priority
      className={className}
    />
  );
}
