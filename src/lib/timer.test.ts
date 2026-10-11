import { describe, expect, it } from "vitest";
import { computeElapsedSeconds } from "@/lib/timer";

describe("computeElapsedSeconds", () => {
  it("sums closed segments and the open segment up to now", () => {
    const now = new Date("2026-10-11T01:00:00Z").getTime();
    const elapsed = computeElapsedSeconds(
      [
        { started_at: "2026-10-11T00:00:00Z", ended_at: "2026-10-11T00:10:00Z" },
        { started_at: "2026-10-11T00:30:00Z", ended_at: "2026-10-11T00:40:00Z" },
        { started_at: "2026-10-11T00:50:00Z", ended_at: null },
      ],
      now,
    );
    expect(elapsed).toBe(30 * 60);
  });

  it("does not count paused time and never goes negative", () => {
    const now = new Date("2026-10-11T00:00:00Z").getTime();
    expect(
      computeElapsedSeconds([{ started_at: "2026-10-11T00:00:05Z", ended_at: null }], now),
    ).toBe(0);
  });
});
