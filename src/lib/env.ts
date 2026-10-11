// Public Supabase settings. Both values are safe to expose to the browser;
// data is protected by Row Level Security, not by hiding these values.
// Never put a service_role / secret key in a NEXT_PUBLIC_ variable.

export function getSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}
