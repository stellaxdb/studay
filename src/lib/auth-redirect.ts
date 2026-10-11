/** Only same-site relative paths are allowed after sign-in (prevents open redirects). */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}

/** Absolute URL of the auth callback route that finishes email and OAuth sign-in. */
export function authCallbackUrl(origin: string, next?: string | null): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", safeNext(next));
  return url.toString();
}
