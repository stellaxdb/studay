"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { GoogleLogo } from "@/components/auth/google-logo";
import { authCallbackUrl } from "@/lib/auth-redirect";
import { authErrorMessage } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Google sign-in button, styled after Google's own "Sign in with Google"
 * button (white, #747775 border, #1f1f1f text, 8% state layer on hover;
 * pill shape is one of Google's official options) with the official "G" logo.
 *
 * Starts Google sign-in. Supabase sends the user to Google and back to
 * /auth/callback, which exchanges the code for a session (PKCE).
 * Works for both new and existing accounts.
 */
export function GoogleButton({
  next,
  onError,
  label = "Google 계정으로 계속하기",
}: {
  next?: string | null;
  onError: (message: string) => void;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authCallbackUrl(window.location.origin, next) },
      });
      if (error) {
        onError(authErrorMessage(error));
        setLoading(false);
      }
      // On success the browser navigates to Google; keep the loading state.
    } catch (err) {
      onError(authErrorMessage(err as Error));
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={loading}
      aria-busy={loading || undefined}
      className="border-google-border text-google-text before:bg-google-text relative inline-flex h-11 w-full items-center justify-center gap-3 overflow-hidden rounded-full border bg-white px-3 text-sm font-medium tracking-[0.25px] whitespace-nowrap transition-shadow duration-200 before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-200 hover:shadow-[0_1px_2px_0_rgb(60_64_67/0.30),0_1px_3px_1px_rgb(60_64_67/0.15)] hover:before:opacity-[0.08] focus-visible:before:opacity-[0.12] active:before:opacity-[0.12] disabled:cursor-wait disabled:shadow-none disabled:before:opacity-0 motion-reduce:transition-none motion-reduce:before:transition-none"
    >
      {loading ? (
        <Loader2 aria-hidden className="relative size-5 animate-spin" />
      ) : (
        <GoogleLogo className="relative size-5 shrink-0" />
      )}
      <span className="relative">{label}</span>
    </button>
  );
}
