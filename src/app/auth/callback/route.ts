import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_EVENT_COOKIE,
  encodeAuthEvent,
  isFirstSignIn,
  measurementId,
  type AuthEvent,
} from "@/lib/analytics";
import { safeNext } from "@/lib/auth-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Finishes sign-in for email confirmation links and Google OAuth.
 * Both arrive with a PKCE `code` (or `token_hash` for email OTP links).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const viaGoogle = searchParams.get("via") === "google";

  // The provider reports failures (e.g. the user cancelled Google consent) as ?error=...
  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Successful sign-ins are reported to GA4 by the next page (see analytics.ts).
  const signedIn = (event: AuthEvent | null) => {
    const response = NextResponse.redirect(`${origin}${next}`);
    if (event && measurementId()) {
      response.cookies.set(AUTH_EVENT_COOKIE, encodeAuthEvent(event), {
        path: "/",
        maxAge: 300,
        sameSite: "lax",
        secure: origin.startsWith("https://"),
        httpOnly: false,
      });
    }
    return response;
  };

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Without ?via=google the code came from an email confirmation link,
        // which completes an email sign-up.
        return signedIn(
          viaGoogle
            ? { name: isFirstSignIn(data.user) ? "sign_up" : "login", method: "google" }
            : { name: "sign_up", method: "email" },
        );
      }
      // Usually the flow was started in another browser or the link was already used.
      return NextResponse.redirect(`${origin}/login?error=callback`);
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) {
        const confirmsSignUp = type === "signup" || type === "email";
        return signedIn(confirmsSignUp ? { name: "sign_up", method: "email" } : null);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
