import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as AnalyticsModule from "@/lib/analytics";

type Analytics = typeof AnalyticsModule;

function fakeWindow() {
  const store = new Map<string, string>();
  return {
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  } as unknown as Window;
}

/** dataLayer entries as plain arrays, e.g. ["event", "login", { method: "email" }]. */
function commands(win: Window) {
  return (win.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
}

async function load(id: string | undefined): Promise<{ a: Analytics; win: Window }> {
  vi.resetModules();
  if (id === undefined) vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
  else vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", id);
  const win = fakeWindow();
  vi.stubGlobal("window", win);
  return { a: await import("@/lib/analytics"), win };
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("without a measurement ID", () => {
  it("does nothing and does not throw", async () => {
    const { a, win } = await load(undefined);
    expect(a.measurementId()).toBeNull();
    expect(a.initAnalytics()).toBe(false);
    a.trackEvent("login", { method: "email" });
    a.trackEventOnce("k", "todo_complete", {});
    expect(win.dataLayer).toBeUndefined();
    expect(win.gtag).toBeUndefined();
  });

  it("ignores a malformed ID", async () => {
    const { a } = await load("UA-123'><script>");
    expect(a.measurementId()).toBeNull();
  });
});

describe("with a measurement ID", () => {
  it("configures once, then sends events after config", async () => {
    const { a, win } = await load("G-TEST123");
    expect(a.initAnalytics()).toBe(true);
    expect(a.initAnalytics()).toBe(true);
    a.trackEvent("login", { method: "email" });

    const sent = commands(win);
    expect(sent.filter((c) => c[0] === "config")).toHaveLength(1);
    expect(sent.filter((c) => c[0] === "js")).toHaveLength(1);
    expect(sent.map((c) => c[0])).toEqual(["js", "config", "event"]);
    expect(sent[2]).toEqual(["event", "login", { method: "email" }]);
    // Exactly like Google's snippet: gtag.js throws on an undefined parameters argument.
    expect(sent[1]).toEqual(["config", "G-TEST123"]);
    // page_view is left to GA4 itself so it can't be sent twice.
    expect(sent.some((c) => c[1] === "page_view")).toBe(false);
  });

  it("adds debug_mode only when NEXT_PUBLIC_GA_DEBUG is true", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_DEBUG", "true");
    const { a, win } = await load("G-TEST123");
    a.initAnalytics();
    expect(commands(win)[1]).toEqual(["config", "G-TEST123", { debug_mode: true }]);
  });

  it("initialises on the first event even before the tag component mounts", async () => {
    const { a, win } = await load("G-TEST123");
    a.trackEvent("subject_create", { has_weekly_goal: "no" });
    expect(commands(win).map((c) => c[0])).toEqual(["js", "config", "event"]);
  });

  it("sends a once-only event a single time per key", async () => {
    const { a, win } = await load("G-TEST123");
    const params = { duration_seconds: 125, duration_minutes: 2, with_todo: "no" } as const;
    a.trackEventOnce("complete:s1", "study_session_complete", params);
    a.trackEventOnce("complete:s1", "study_session_complete", params);
    a.trackEventOnce("complete:s2", "study_session_complete", params);
    expect(commands(win).filter((c) => c[0] === "event")).toHaveLength(2);
  });

  it("remembers once-only keys across a reload in the same tab", async () => {
    const { a, win } = await load("G-TEST123");
    a.trackEventOnce("complete:s1", "study_session_complete", {
      duration_seconds: 60,
      duration_minutes: 1,
      with_todo: "yes",
    });
    // Simulate a reload: fresh module and dataLayer, same sessionStorage.
    vi.resetModules();
    const reloaded: Analytics = await import("@/lib/analytics");
    win.dataLayer = [];
    win.__studayGaId = undefined;
    reloaded.trackEventOnce("complete:s1", "study_session_complete", {
      duration_seconds: 60,
      duration_minutes: 1,
      with_todo: "yes",
    });
    expect(commands(win).filter((c) => c[0] === "event")).toHaveLength(0);
  });
});

describe("auth event cookie helpers", () => {
  it("round-trips valid events and rejects anything else", async () => {
    const { a } = await load(undefined);
    expect(a.decodeAuthEvent(a.encodeAuthEvent({ name: "sign_up", method: "google" }))).toEqual({
      name: "sign_up",
      method: "google",
    });
    expect(a.decodeAuthEvent("login.email")).toEqual({ name: "login", method: "email" });
    expect(a.decodeAuthEvent("purchase.email")).toBeNull();
    expect(a.decodeAuthEvent("login.someone@example.com")).toBeNull();
    expect(a.decodeAuthEvent(undefined)).toBeNull();
  });

  it("treats an OAuth sign-in right after account creation as a sign-up", async () => {
    const { a } = await load(undefined);
    expect(
      a.isFirstSignIn({
        created_at: "2026-10-11T10:00:00.000Z",
        last_sign_in_at: "2026-10-11T10:00:00.420Z",
      }),
    ).toBe(true);
    expect(
      a.isFirstSignIn({
        created_at: "2026-09-01T10:00:00Z",
        last_sign_in_at: "2026-10-11T10:00:00Z",
      }),
    ).toBe(false);
    expect(a.isFirstSignIn({ created_at: "2026-10-11T10:00:00Z", last_sign_in_at: null })).toBe(
      false,
    );
  });
});
