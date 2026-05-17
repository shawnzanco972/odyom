import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { todayKeyIST } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface RecentPlay {
  display: string;
  outcome: "survive" | "death";
  playedAt: string; // ISO
}

export interface RecentActivityResponse {
  plays: RecentPlay[];
  totalToday: number;
  survivorsToday: number;
}

export async function GET(): Promise<NextResponse<RecentActivityResponse>> {
  const supabase = await getServerClient();
  const today = todayKeyIST(new Date());

  const { data, count } = await supabase
    .from("users")
    .select("username, nickname, last_outcome, last_played_at", { count: "exact" })
    .eq("last_played_date", today)
    .not("last_played_at", "is", null)
    .order("last_played_at", { ascending: false })
    .limit(10);

  const plays: RecentPlay[] = (data ?? [])
    .filter(r => r.last_outcome === "survive" || r.last_outcome === "death")
    .map(r => ({
      display: (r.nickname?.trim() || r.username || "ישראלי").toString(),
      outcome: r.last_outcome as "survive" | "death",
      playedAt: r.last_played_at!,
    }));

  const { count: survivorsCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("last_played_date", today)
    .eq("last_outcome", "survive");

  const survivorsToday = survivorsCount ?? 0;

  return NextResponse.json({
    plays,
    totalToday: count ?? plays.length,
    survivorsToday,
  });
}
