import Image from "next/image";

// public/logo.png is 354×108 (3× of the largest 36px use, for crisp rendering).
const RATIO = 354 / 108;

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
