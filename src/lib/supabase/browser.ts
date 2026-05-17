"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

type Client = ReturnType<typeof createBrowserClient<Database>>;
let cached: Client | null = null;

/**
 * Returns a singleton Supabase browser client, or `null` if the env vars
 * aren't configured (e.g., during a misconfigured deploy or static export).
 * Callers should treat `null` as "auth unavailable" and degrade gracefully.
 */
export function getBrowserClient(): Client | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (typeof window !== "undefined") {
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing — auth disabled.",
      );
    }
    return null;
  }
  cached = createBrowserClient<Database>(url, key);
  return cached;
}
