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

export const runtime = "nodejs";

export interface VerdictResponse {
  outcome: "survive" | "death";
  reasonText: string;
  fallbackReasonText: string;
  totalSlices: number;     // size of the roulette wheel at judgement time
  replay: boolean;
  streak: number;
  score: number;
}

export async function POST(req: NextRequest): Promise<NextResponse<VerdictResponse | { error: string }>> {
  const url = new URL(req.url);
  const force = url.searchParams.get("force");
  const mockHourRaw = url.searchParams.get("hour");
  const mockHour = mockHourRaw !== null ? Number(mockHourRaw) : null;
  const dev = url.searchParams.get("dev") === "true";

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

  const now = new Date();
  const todayKey = todayKeyIST(now);
  const state = mockHour !== null ? activeSlotsForHour(mockHour) : activeSlots(now);

  // --- REPLAY ---
  if (
    !dev &&
    userRow.last_played_date === todayKey &&
    userRow.last_outcome &&
    userRow.last_reason
  ) {
    return NextResponse.json({
      outcome: userRow.last_outcome,
      reasonText: userRow.last_reason,
      fallbackReasonText: userRow.last_reason,
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
    // Risk curve scales LOW → HIGH through the day; capped at 55% in the
    // 2-slice endgame so it stays a real coin-flip, not a death sentence.
    const intervals = 32 - state.ballsDropped;
    const deathOdds = Math.min(0.55, 0.05 + 0.5 * (intervals / 30));
    outcome = Math.random() < deathOdds ? "death" : "survive";
  }
  const hour = mockHour ?? istHour(now);
  const reasonText = outcome === "death" ? pickDeath() : pickSurvive(hour);
  const fallbackReasonText = outcome === "death" ? pickSurvive(hour) : pickDeath();

  let newStreak = userRow.current_streak;
  let newScore = userRow.total_score;
  if (!dev) {
    newStreak = outcome === "survive" ? userRow.current_streak + 1 : 0;
    newScore = userRow.total_score + (outcome === "survive" ? 10 + (32 - state.ballsDropped) : 0);
    const newHighest = Math.max(userRow.highest_streak, newStreak);
    const newSeen = userRow.seen_reasons.includes(reasonText)
      ? userRow.seen_reasons
      : [...userRow.seen_reasons, reasonText];

    const { error: updateErr } = await supabase
      .from("users")
      .update({
        total_score: newScore,
        current_streak: newStreak,
        highest_streak: newHighest,
        madness_tag: madnessTagForStreak(newStreak),
        seen_reasons: newSeen,
        last_played_date: todayKey,
        last_played_at: new Date().toISOString(),
        last_outcome: outcome,
        last_reason: reasonText,
      })
      .eq("id", user.id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
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
