import { NextRequest, NextResponse } from "next/server";
import {
  activeSlots,
  activeSlotsForHour,
  closedSlotIndices,
  istHour,
  todayKeyIST,
} from "@/lib/time";
import { pickDeath, pickSurvive } from "@/lib/content";

export const runtime = "nodejs";

// MUSICAL CHAIRS: the server no longer pre-selects a target slot. It only
// pre-determines who survives (the one left out) vs who dies (the one who
// claims a seat). The Pegboard derives DEATH/SURVIVAL from where the red
// ball physically settles.
export interface VerdictResponse {
  outcome: "survive" | "death";
  reasonText: string;
  fallbackReasonText: string;
  ballsDropped: number;
  openCount: number;
  closedCount: number;
  closedSlotIndices: number[];
}

export async function POST(req: NextRequest): Promise<NextResponse<VerdictResponse>> {
  const url = new URL(req.url);
  const force = url.searchParams.get("force"); // "survive" | "death" | null
  const mockHourRaw = url.searchParams.get("hour");
  const mockHour = mockHourRaw !== null ? Number(mockHourRaw) : null;

  const now = new Date();
  const state =
    mockHour !== null ? activeSlotsForHour(mockHour) : activeSlots(now);
  const dayKey = todayKeyIST(now);

  let outcome: "survive" | "death";
  if (force === "survive" || force === "death") {
    outcome = force;
  } else {
    // Risk curve scales LOW → HIGH through the day:
    //   intervals = 0  (08:00) → ~5%   death
    //   intervals = 12 (14:00) → ~25%  death
    //   intervals = 22 (19:00) → ~42%  death
    //   intervals = 30 (23:00) → ~55%  death (true 50/50-ish endgame)
    const intervals = 32 - state.ballsDropped;
    const deathOdds = Math.min(0.55, 0.05 + 0.5 * (intervals / 30));
    outcome = Math.random() < deathOdds ? "death" : "survive";
  }

  const hour = mockHour ?? istHour(now);

  return NextResponse.json({
    outcome,
    reasonText: outcome === "death" ? pickDeath() : pickSurvive(hour),
    fallbackReasonText: outcome === "death" ? pickSurvive(hour) : pickDeath(),
    ballsDropped: state.ballsDropped,
    openCount: state.openCount,
    closedCount: state.closedCount,
    closedSlotIndices: closedSlotIndices(state.closedCount, dayKey),
  });
}
