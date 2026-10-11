import { mutate } from "swr";

export type KeyName =
  | "settings"
  | "subjects"
  | "categories"
  | "todos"
  | "events"
  | "intervals"
  | "sessions"
  | "active-session";

/** Revalidates every cached query whose key starts with one of the names. */
export function revalidate(...names: KeyName[]) {
  // Calling mutate with only a matcher keeps current data and refetches.
  return mutate((key) => Array.isArray(key) && names.includes(key[0] as KeyName));
}

let clearedWhileSignedOut = false;

/**
 * Drops every cached query so one account's data is never shown to another.
 * After signing out nothing is refetched (there is no session); the next
 * sign-in refetches everything in use.
 */
export function clearCache({ refetch }: { refetch: boolean }) {
  clearedWhileSignedOut = !refetch;
  return mutate(() => true, undefined, { revalidate: refetch });
}

export function cacheNeedsRefetch() {
  return clearedWhileSignedOut;
}
