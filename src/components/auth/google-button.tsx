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
}: {
  next?: string | null;
  onError: (message: string) => void;
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
      Google 계정으로 계속하기
    </Button>
  );
}

export function AuthDivider() {
  return (
    <div className="text-fg-tertiary my-6 flex items-center gap-3 text-xs" role="separator">
      <span className="bg-border h-px flex-1" aria-hidden />
      또는 이메일로
      <span className="bg-border h-px flex-1" aria-hidden />
    </div>
  );
}
