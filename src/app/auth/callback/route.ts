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

/** Finishes Google sign-in: exchanges the PKCE `code` for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");

  // The provider reports failures (e.g. the user cancelled Google consent) as ?error=...
  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Successful sign-ins are reported to GA4 by the next page (see analytics.ts).
  const signedIn = (event: AuthEvent) => {
    const response = NextResponse.redirect(`${origin}${next}`);
    if (measurementId()) {
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
  if (supabase && code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return signedIn({ name: isFirstSignIn(data.user) ? "sign_up" : "login", method: "google" });
    }
    // Usually the flow was started in another browser or the code was already used.
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
