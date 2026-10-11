import { describe, expect, it } from "vitest";
import { eventDays } from "@/lib/events";

describe("eventDays", () => {
  const base = {
    id: "e",
    user_id: "u",
    subject_id: null,
    title: "e",
    event_type: "exam" as const,
    all_day: false,
    note: null,
    created_at: "",
    updated_at: "",
  };
  it("places an event on its start day in the user's timezone", () => {
    expect(
      eventDays({ ...base, starts_at: "2026-10-11T15:30:00Z", ends_at: null }, "Asia/Seoul"),
    ).toEqual(["2026-10-12"]);
  });
  it("spans multi-day events but not the day it ends at midnight", () => {
    expect(
      eventDays(
        { ...base, starts_at: "2026-10-11T00:00:00Z", ends_at: "2026-10-12T15:00:00Z" },
        "Asia/Seoul",
      ),
    ).toEqual(["2026-10-11", "2026-10-12"]);
  });
});
