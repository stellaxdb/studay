"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

export class MissingSupabaseEnvError extends Error {
  constructor() {
    super("SUPABASE_ENV_MISSING");
  }
}

/** Browser Supabase client (singleton). Created lazily so builds work without env vars. */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const env = getSupabaseEnv();
  if (!env) throw new MissingSupabaseEnvError();
  client = createBrowserClient(env.url, env.key);
  return client;
}
