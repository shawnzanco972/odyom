import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

export type SentenceType = "survive" | "death";
export type TimeSlot = "morning" | "noon" | "afternoon" | "night";

/** Map IST hour → narrative slot (1:1 with the 4 suggestion-form buttons). */
export function timeSlotForHour(h: number): TimeSlot {
  if (h >= 6 && h < 12) return "morning";   // בוקר
  if (h >= 12 && h < 16) return "noon";     // צהריים
  if (h >= 16 && h < 20) return "afternoon"; // אחה"צ
  return "night";                            // לילה (20:00–05:59, wraps)
}

/** DB boolean column name for a given slot. */
function slotColumn(slot: TimeSlot): "is_morning" | "is_noon" | "is_afternoon" | "is_night" {
  switch (slot) {
    case "morning":   return "is_morning";
    case "noon":      return "is_noon";
    case "afternoon": return "is_afternoon";
    case "night":     return "is_night";
  }
}

/**
 * Anti-drought fallback chain. Boolean-column architecture:
 *   1. Exact-slot OR is_general — sentences explicitly tagged for the
 *      current time of day plus the always-available general pool.
 *   2. is_general only — the migrated bulk pool, used when step 1 still
 *      somehow returns nothing.
 *   3. Any approved sentence of this type — last-resort failsafe so the
 *      modal never renders an empty string.
 *
 * Each step performs a count + range(offset, offset) random pick, O(1).
 */
export async function pickReason(
  supabase: SupabaseClient<Database>,
  type: SentenceType,
  hour: number,
): Promise<string> {
  const slot = timeSlotForHour(hour);
  const col = slotColumn(slot);

  // Step 1 — slot match OR general
  const step1 = await fetchRandomApproved(supabase, type, `${col}.eq.true,is_general.eq.true`);
  if (step1) return step1;

  // Step 2 — general only
  const step2 = await fetchRandomApproved(supabase, type, "is_general.eq.true");
  if (step2) return step2;

  // Step 3 — any approved
  const step3 = await fetchRandomApproved(supabase, type, null);
  if (step3) return step3;

  return type === "survive"
    ? "שרדת עוד יום בישראל. לא ברור איך."
    : "מתת. לא ברור איך עוד היית כאן.";
}

/**
 * @param orFilter `null` for no additional filter, or a comma-separated
 *   .or()-compatible string (e.g., "is_morning.eq.true,is_general.eq.true").
 */
async function fetchRandomApproved(
  supabase: SupabaseClient<Database>,
  type: SentenceType,
  orFilter: string | null,
): Promise<string | null> {
  let countQuery = supabase
    .from("game_sentences")
    .select("id", { count: "exact", head: true })
    .eq("type", type)
    .eq("status", "approved");
  if (orFilter !== null) countQuery = countQuery.or(orFilter);
  const { count } = await countQuery;
  if (!count || count === 0) return null;

  const offset = Math.floor(Math.random() * count);
  let pickQuery = supabase
    .from("game_sentences")
    .select("text")
    .eq("type", type)
    .eq("status", "approved");
  if (orFilter !== null) pickQuery = pickQuery.or(orFilter);
  const { data } = await pickQuery.range(offset, offset).limit(1);
  return data?.[0]?.text ?? null;
}
