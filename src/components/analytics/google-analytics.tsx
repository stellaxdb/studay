"use client";

import Script from "next/script";
import { useEffect } from "react";
import { consumeAuthEventCookie, initAnalytics, measurementId } from "@/lib/analytics";

/**
 * Loads the GA4 Google tag once for the whole app (rendered in the root
 * layout). Renders nothing when NEXT_PUBLIC_GA_MEASUREMENT_ID is not set.
 */
export function GoogleAnalytics() {
  const id = measurementId();

  useEffect(() => {
    initAnalytics();
    // Report a sign-up/login finished by /auth/callback (Google, email link).
    consumeAuthEventCookie();
  }, []);

  if (!id) return null;
  return (
    <Script
      id="ga4-gtag"
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
      strategy="afterInteractive"
    />
  );
}
