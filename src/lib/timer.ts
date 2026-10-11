import type { StudySegment } from "@/lib/types";

/**
 * Elapsed active seconds of a session, derived from its segments.
 * `nowMs` must already be corrected to server time (see useServerClock),
 * so the result never depends on how often the UI re-rendered.
 */
export function computeElapsedSeconds(
  segments: Pick<StudySegment, "started_at" | "ended_at">[],
  nowMs: number,
): number {
  let total = 0;
  for (const seg of segments) {
    const start = new Date(seg.started_at).getTime();
    const end = seg.ended_at ? new Date(seg.ended_at).getTime() : nowMs;
    total += Math.max(0, end - start);
  }
  return Math.floor(total / 1000);
}
