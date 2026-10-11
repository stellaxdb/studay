"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authCallbackUrl } from "@/lib/auth-redirect";
import { authErrorMessage } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/client";

/**
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
    <Button variant="secondary" className="h-11 w-full" loading={loading} onClick={signIn}>
      {label}
    </Button>
  );
}
