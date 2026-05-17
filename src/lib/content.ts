import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

export type SentenceType = "survive" | "death";
export type TimeSlot = "morning" | "noon" | "afternoon" | "night" | "general";

// Map IST hour → narrative time slot, 1:1 with the 4 buttons in the
// suggestion form (בוקר / צהריים / אחה"צ / לילה):
//   06:00–11:59 → morning   (בוקר)
//   12:00–15:59 → noon      (צהריים)
//   16:00–19:59 → afternoon (אחה"צ)
//   20:00–05:59 → night     (לילה — wraps past midnight)
// The game itself is locked before 08:00 IST so the early-AM night range is
// rarely hit in production, but we keep the mapping complete for correctness.
export function timeSlotForHour(h: number): Exclude<TimeSlot, "general"> {
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 16) return "noon";
  if (h >= 16 && h < 20) return "afternoon";
  return "night";
}

/**
 * Anti-drought fallback chain for picking an approved sentence:
 *   1. exact time_slot match for the current hour
 *   2. fallback to time_slot='general' (the migrated historical pool)
 *   3. last resort: any approved sentence of this type, regardless of slot
 *
 * Performs at most 3 DB round-trips, short-circuits as soon as a row is
 * found. Returns a soft default string if every step misses (should never
 * happen once the table is seeded).
 */
export async function pickReason(
  supabase: SupabaseClient<Database>,
  type: SentenceType,
  hour: number,
): Promise<string> {
  const slot = timeSlotForHour(hour);

  // Step 1 — exact time-of-day match
  const exact = await fetchRandomApproved(supabase, type, slot);
  if (exact) return exact;

  // Step 2 — fall back to the 'general' pool (the migrated bulk content)
  const general = await fetchRandomApproved(supabase, type, "general");
  if (general) return general;

  // Step 3 — last-resort: anything approved of this type
  const any = await fetchRandomApproved(supabase, type, null);
  if (any) return any;

  // Soft default — should not be reachable once table is seeded.
  return type === "survive"
    ? "שרדת עוד יום בישראל. לא ברור איך."
    : "מתת. לא ברור איך עוד היית כאן.";
}

async function fetchRandomApproved(
  supabase: SupabaseClient<Database>,
  type: SentenceType,
  slot: TimeSlot | null,
): Promise<string | null> {
  // Count first so we can pick a random offset (Postgres ORDER BY random()
  // is OK at our scale but quadratic — count+offset stays O(1) per pick).
  let countQuery = supabase
    .from("game_sentences")
    .select("id", { count: "exact", head: true })
    .eq("type", type)
    .eq("status", "approved");
  if (slot !== null) countQuery = countQuery.eq("time_slot", slot);
  const { count } = await countQuery;
  if (!count || count === 0) return null;

  const offset = Math.floor(Math.random() * count);
  let pickQuery = supabase
    .from("game_sentences")
    .select("text")
    .eq("type", type)
    .eq("status", "approved");
  if (slot !== null) pickQuery = pickQuery.eq("time_slot", slot);
  const { data } = await pickQuery.range(offset, offset).limit(1);
  return data?.[0]?.text ?? null;
}
