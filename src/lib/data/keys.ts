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
