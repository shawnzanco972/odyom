import { NextRequest, NextResponse } from "next/server";
import {
  activeSlots,
  activeSlotsForHour,
  istHour,
  todayKeyIST,
} from "@/lib/time";
import { pickDeath, pickSurvive } from "@/lib/content";
import { madnessTagForStreak } from "@/lib/madness";
import { getServerClient } from "@/lib/supabase/server";
import { normalizeUserRow } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const runtime = "nodejs";

export interface VerdictResponse {
  outcome: "survive" | "death";
  reasonText: string;
  fallbackReasonText: string;
  totalSlices: number;
  replay: boolean;
  streak: number;
  score: number;
}

// Server-only flag — must be explicitly enabled per env. NODE_ENV check is a
// belt-and-suspenders defence so even a misconfigured prod can't honour dev
// overrides.
function devOverridesAllowed(): boolean {
  if (process.env.NODE_ENV === "production") {
    return process.env.NEXT_PUBLIC_DEV_MODE === "true";
  }
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse<VerdictResponse | { error: string }>> {
  const url = new URL(req.url);
  const devAllowed = devOverridesAllowed();

  // Dev-only overrides — silently ignored in production builds.
  const force = devAllowed ? url.searchParams.get("force") : null;
  const mockHourRaw = devAllowed ? url.searchParams.get("hour") : null;
  const mockHour = mockHourRaw !== null ? Number(mockHourRaw) : null;
  const dev = devAllowed && url.searchParams.get("dev") === "true";

  // `attempt=true` distinguishes an explicit spin click from a hydration ping.
  // Locked-out hydration → 200 + replay payload (so the client renders the
  // saved outcome cleanly on refresh). Locked-out attempt → 403 to make
  // tampering obvious.
  const isExplicitAttempt = url.searchParams.get("attempt") === "true";

  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: raw, error: userErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (userErr || !raw) {
    return NextResponse.json({ error: "user row missing" }, { status: 500 });
  }
  const userRow = normalizeUserRow(raw);

  // SERVER-AUTHORITATIVE TIME. Client-provided times are never used for verdict
  // logic — only the dev-only `hour` override is honoured, and only when dev
  // overrides are allowed for this build.
  const now = new Date();
  const todayKey = todayKeyIST(now);
  const state = mockHour !== null ? activeSlotsForHour(mockHour) : activeSlots(now);

  // --- REPLAY / LOCKOUT ---
  const isLocked =
    !dev &&
    userRow.last_played_date === todayKey &&
    userRow.last_outcome &&
    userRow.last_reason;

  if (isLocked) {
    if (isExplicitAttempt) {
      return NextResponse.json({ error: "locked" }, { status: 403 });
    }
    return NextResponse.json({
      outcome: userRow.last_outcome!,
      reasonText: userRow.last_reason!,
      fallbackReasonText: userRow.last_reason!,
      totalSlices: state.ballsDropped,
      replay: true,
      streak: userRow.current_streak,
      score: userRow.total_score,
    });
  }

  // --- NEW PLAY ---
  let outcome: "survive" | "death";
  if (force === "survive" || force === "death") {
    outcome = force;
  } else {
    const intervals = 32 - state.ballsDropped;
    const deathOdds = Math.min(0.55, 0.05 + 0.5 * (intervals / 30));
    outcome = Math.random() < deathOdds ? "death" : "survive";
  }
  const hour = mockHour ?? istHour(now);
  const reasonText = outcome === "death" ? pickDeath() : pickSurvive(hour);
  const fallbackReasonText = outcome === "death" ? pickSurvive(hour) : pickDeath();

  const isFirstEverPlay = !userRow.has_played_ever;
  const isDeath = outcome === "death";

  // Computed-but-not-yet-persisted values. Always returned in the response
  // so the UI can preview the result even when dev mode skips the DB write.
  const newStreak = isDeath ? 0 : userRow.current_streak + 1;
  const newScore = userRow.total_score + (isDeath ? 0 : 10 + (32 - state.ballsDropped));

  // Dev mode is a true sandbox: NO writes to users, NO play row, NO rescue.
  // The response still carries newStreak/newScore so the modal renders the
  // computed deltas without polluting the leaderboard or daily-play state.
  if (!dev) {
    const newHighest = Math.max(userRow.highest_streak, newStreak);
    const newSeen = userRow.seen_reasons.includes(reasonText)
      ? userRow.seen_reasons
      : [...userRow.seen_reasons, reasonText];
    // Snapshot the streak the moment it breaks so a friend can rescue it.
    const streakBeforeLastDeath =
      isDeath && userRow.current_streak > 0
        ? userRow.current_streak
        : userRow.streak_before_last_death;

    const { error: updateErr } = await supabase
      .from("users")
      .update({
        total_score: newScore,
        current_streak: newStreak,
        highest_streak: newHighest,
        madness_tag: madnessTagForStreak(newStreak),
        seen_reasons: newSeen,
        last_played_date: todayKey,
        last_played_at: now.toISOString(),
        last_outcome: outcome,
        last_reason: reasonText,
        has_played_ever: true,
        streak_before_last_death: streakBeforeLastDeath,
      })
      .eq("id", user.id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await supabase.from("plays").insert({
      user_id: user.id,
      played_at: now.toISOString(),
      played_date: todayKey,
      outcome,
      reason: reasonText,
      total_slices: state.ballsDropped,
      streak_at_play: newStreak,
    });

    if (isFirstEverPlay && userRow.referrer_id) {
      await rescueReferrer(supabase, userRow.referrer_id);
    }
  }

  return NextResponse.json({
    outcome,
    reasonText,
    fallbackReasonText,
    totalSlices: state.ballsDropped,
    replay: false,
    streak: newStreak,
    score: newScore,
  });
}

/**
 * Resurrect the referrer's broken streak. Silently no-ops if they have no
 * broken streak to restore (so the referee still gets a clean play either way).
 */
async function rescueReferrer(
  supabase: SupabaseClient<Database>,
  referrerId: string,
): Promise<void> {
  const { data: rawReferrer } = await supabase
    .from("users")
    .select("*")
    .eq("id", referrerId)
    .single();
  if (!rawReferrer) return;
  const referrer = normalizeUserRow(rawReferrer);

  const snapshot = referrer.streak_before_last_death ?? 0;
  if (referrer.current_streak !== 0 || snapshot <= 0) return;

  const restoredStreak = snapshot;
  const newHighest = Math.max(referrer.highest_streak, restoredStreak);

  await supabase
    .from("users")
    .update({
      current_streak: restoredStreak,
      highest_streak: newHighest,
      madness_tag: madnessTagForStreak(restoredStreak),
      rescue_pending: true,
    })
    .eq("id", referrerId);
}
