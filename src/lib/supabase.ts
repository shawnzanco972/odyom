// TODO: wire to real Supabase project `frnquwhbasformccyxcr` once auth flow lands.
// For v1 this file just exposes a createClient() factory; the verdict route
// uses an in-memory stub instead.
import { createClient } from "@supabase/supabase-js";

export function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}
