import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Hard-reset the signed-in user's stats AND delete their plays history.
 * Only honored in non-prod builds (or when NEXT_PUBLIC_DEV_MODE=true is
 * explicitly set in Vercel env) so it can't be abused in production.
 *
 * Self-update / self-delete are allowed by existing RLS policies, so no
 * service role key is required.
 */
function devAllowed(): boolean {
  if (process.env.NODE_ENV === "production") {
    return process.env.NEXT_PUBLIC_DEV_MODE === "true";
  }
  return true;
}

export async function POST(): Promise<NextResponse<{ ok: true; deletedPlays: number } | { error: string }>> {
  if (!devAllowed()) {
    return NextResponse.json({ error: "dev wipe disabled in production" }, { status: 403 });
  }

  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Reset every gameplay-related column on the users row. We keep id,
  // username, nickname, and referrer_id so the account itself stays intact.
  const { error: updateErr } = await supabase
    .from("users")
    .update({
      total_score: 0,
      current_streak: 0,
      highest_streak: 0,
      madness_tag: "ישראלי ממוצע",
      seen_reasons: [],
      last_played_date: null,
      last_played_at: null,
      last_outcome: null,
      last_reason: null,
      streak_before_last_death: null,
      rescue_pending: false,
      has_played_ever: false,
    })
    .eq("id", user.id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Wipe per-play history. RLS lets users delete their own rows.
  const { data: deleted } = await supabase
    .from("plays")
    .delete()
    .eq("user_id", user.id)
    .select("id");

  return NextResponse.json({ ok: true, deletedPlays: (deleted ?? []).length });
}
