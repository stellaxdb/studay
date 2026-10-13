/** Only same-site relative paths are allowed after sign-in (prevents open redirects). */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}

/** The start (login) page that returns to `next` after signing in. */
export function loginHref(next?: string | null): string {
  const target = safeNext(next);
  return target === "/" ? "/login" : `/login?next=${encodeURIComponent(target)}`;
}

/** Absolute URL of the auth callback route that finishes Google sign-in. */
export function authCallbackUrl(origin: string, next?: string | null): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", safeNext(next));
  return url.toString();
}
