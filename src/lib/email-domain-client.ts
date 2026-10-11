"use client";

import { isCommonDomain, isValidDomain, type Deliverability } from "@/lib/email-domain";

const results = new Map<string, Promise<Deliverability>>();

/**
 * Asks /api/email-domain whether a domain can receive mail. Answers are
 * cached for the page's lifetime; network errors and timeouts resolve to
 * null ("unknown") so the caller can let sign-up continue.
 */
export function checkEmailDomain(domain: string): Promise<Deliverability> {
  if (!isValidDomain(domain)) return Promise.resolve(false);
  if (isCommonDomain(domain)) return Promise.resolve(true);
  const cached = results.get(domain);
  if (cached) return cached;

  const request = (async (): Promise<Deliverability> => {
    try {
      const res = await fetch(`/api/email-domain?domain=${encodeURIComponent(domain)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { deliverable?: unknown };
      return typeof body.deliverable === "boolean" ? body.deliverable : null;
    } catch (error) {
      console.warn("[email-domain] check skipped", error);
      return null;
    }
  })();
  results.set(domain, request);
  // Don't keep "unknown" so a later attempt can retry.
  void request.then((value) => {
    if (value === null) results.delete(domain);
  });
  return request;
}
