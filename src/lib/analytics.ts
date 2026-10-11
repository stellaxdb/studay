// Google Analytics 4 (gtag.js). Every function is a safe no-op when
// NEXT_PUBLIC_GA_MEASUREMENT_ID is not set, and never throws, so analytics
// can't break a feature.
//
// Page views: GA4 sends the first page_view from `config` and, with enhanced
// measurement's "page changes based on browser history events" (on by
// default), one page_view per client-side route change. This module never
// sends page_view itself, so the two can't double up.
//
// Privacy: event parameters are limited to the typed fields below — no
// names, emails, titles, notes or ids.

import type { Priority } from "@/lib/types";

type YesNo = "yes" | "no";
export type AuthMethod = "email" | "google";

export interface AnalyticsEvents {
  sign_up: { method: AuthMethod };
  login: { method: AuthMethod };
  study_session_start: { with_todo: YesNo };
  study_session_pause: Record<string, never>;
  study_session_complete: { duration_seconds: number; duration_minutes: number; with_todo: YesNo };
  todo_create: { priority: Priority; has_due_date: YesNo; has_category: YesNo };
  todo_complete: Record<string, never>;
  subject_create: { has_weekly_goal: YesNo };
}
export type AnalyticsEventName = keyof AnalyticsEvents;

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    __studayGaId?: string;
  }
}

export const yesNo = (value: unknown): YesNo => (value ? "yes" : "no");

/** The configured measurement ID, or null when GA is off (unset or malformed). */
export function measurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id && /^G-[A-Z0-9]+$/i.test(id) ? id : null;
}

/**
 * Sets up dataLayer/gtag and sends `config` exactly once per page load.
 * Returns whether GA is active.
 */
export function initAnalytics(): boolean {
  if (typeof window === "undefined") return false;
  const id = measurementId();
  if (!id) return false;
  if (window.__studayGaId === id) return true;

  window.dataLayer = window.dataLayer ?? [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      // gtag.js expects the Arguments object itself, not an array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
  }
  window.gtag("js", new Date());
  // Never pass an undefined third argument: gtag.js throws on it and stops.
  if (process.env.NEXT_PUBLIC_GA_DEBUG === "true") {
    window.gtag("config", id, { debug_mode: true });
  } else {
    window.gtag("config", id);
  }
  window.__studayGaId = id;
  return true;
}

export function trackEvent<N extends AnalyticsEventName>(name: N, params: AnalyticsEvents[N]) {
  try {
    if (!initAnalytics()) return;
    window.gtag!("event", name, params);
  } catch (error) {
    console.warn("[analytics] event not sent", name, error);
  }
}

// ---------------------------------------------------------------------------
// Once-only events. Timer pause/finish are idempotent in the database, so a
// retried request returns the same result; a key per outcome keeps the event
// from being sent twice (also across a reload in the same tab).
// ---------------------------------------------------------------------------
const SENT_KEY = "studay:ga-sent";
const sent = new Set<string>();

function loadSent() {
  try {
    const raw = window.sessionStorage.getItem(SENT_KEY);
    if (raw) for (const key of JSON.parse(raw) as string[]) sent.add(key);
  } catch {
    // sessionStorage unavailable (private mode, blocked storage): memory only.
  }
}

function saveSent() {
  try {
    window.sessionStorage.setItem(SENT_KEY, JSON.stringify([...sent].slice(-50)));
  } catch {
    // See loadSent.
  }
}

export function trackEventOnce<N extends AnalyticsEventName>(
  key: string,
  name: N,
  params: AnalyticsEvents[N],
) {
  if (typeof window === "undefined" || !measurementId()) return;
  if (sent.size === 0) loadSent();
  if (sent.has(key)) return;
  sent.add(key);
  saveSent();
  trackEvent(name, params);
}

// ---------------------------------------------------------------------------
// Sign-in that finishes on the server (/auth/callback) hands its result to
// the next page through a short-lived cookie, which the browser reports once.
// ---------------------------------------------------------------------------
export const AUTH_EVENT_COOKIE = "studay_auth_event";

export type AuthEvent = { name: "sign_up" | "login"; method: AuthMethod };

export function encodeAuthEvent(event: AuthEvent): string {
  return `${event.name}.${event.method}`;
}

export function decodeAuthEvent(value: string | undefined | null): AuthEvent | null {
  const [name, method] = (value ?? "").split(".");
  if ((name === "sign_up" || name === "login") && (method === "email" || method === "google")) {
    return { name, method };
  }
  return null;
}

/** A first OAuth sign-in creates the user and signs in within the same request. */
export function isFirstSignIn(user: { created_at?: string; last_sign_in_at?: string | null }) {
  const created = Date.parse(user.created_at ?? "");
  const signedIn = Date.parse(user.last_sign_in_at ?? "");
  return Number.isFinite(created) && Number.isFinite(signedIn) && signedIn - created < 60_000;
}

/** Reads, clears and reports the auth event cookie set by /auth/callback. */
export function consumeAuthEventCookie() {
  if (typeof document === "undefined") return;
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${AUTH_EVENT_COOKIE}=`));
  if (!match) return;
  document.cookie = `${AUTH_EVENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  const event = decodeAuthEvent(decodeURIComponent(match.slice(AUTH_EVENT_COOKIE.length + 1)));
  if (event) trackEvent(event.name, { method: event.method });
}
