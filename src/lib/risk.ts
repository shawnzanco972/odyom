// Single source of truth for risk-tier mapping. Used by both the in-game
// RiskGauge bar and the OutcomeModal risk badge so they're always aligned.
//
// We map `actualRisk` (0–0.55) → `visualPct` (0–100) by scaling so that the
// late-night 50/50 endgame fills the gauge to red. Tier labels are placeholder
// Hebrew — replace with the canonical Gemini copy when ready.

import { survivalChanceFromBalls } from "@/lib/time";

export interface RiskTier {
  label: string;
  color: string;
  visualPct: number; // 0..100
}

export function riskToVisualPercent(actualRisk: number): number {
  return Math.min(100, Math.max(0, (actualRisk / 0.5) * 100));
}

const TIERS: { upperPct: number; label: string; color: string }[] = [
  // upperPct exclusive on its bucket. Labels are the canonical cynical copy.
  { upperPct: 20,  label: "אשליית שליטה", color: "#22C55E" }, // emerald
  { upperPct: 40,  label: "שלב ההכחשה",   color: "#84CC16" }, // lime
  { upperPct: 60,  label: "הימור מחושב",  color: "#EAB308" }, // yellow
  { upperPct: 80,  label: "דופק בשמיים",  color: "#F59E0B" }, // orange
  { upperPct: 101, label: "משאלת מוות",   color: "#DC2626" }, // crimson — bucket >=80
];

export function riskTierFromVisualPct(visualPct: number): RiskTier {
  for (const t of TIERS) {
    if (visualPct < t.upperPct) {
      return { label: t.label, color: t.color, visualPct };
    }
  }
  const last = TIERS[TIERS.length - 1];
  return { label: last.label, color: last.color, visualPct };
}

export function riskTierFromBalls(ballsDropped: number): RiskTier {
  const actualRisk = 1 - survivalChanceFromBalls(ballsDropped);
  return riskTierFromVisualPct(riskToVisualPercent(actualRisk));
}

// ───────────────────────────────────────────────────────────────────────────
// Scoring — 1-to-1 Progressive Pruning + Risk Bonus
//
// BASE_SLOTS holds the fixed value table (31 ascending values, sparse at the
// top). As the day advances we PRUNE low values from the bottom of the pool
// (low-reward slots disappear first) and shuffle the surviving values 1-to-1
// onto the open green slots. A separate Risk Bonus R(t) is added on top.
//
//   t   = 1-based interval index since 08:00 IST (t=1 at 08:00, t=32 at 23:30+)
//   N(t)  = max(2, 33 - t)   — total slots on screen
//   S_open = N(t) - 1        — open green slots
//   pool   = BASE_SLOTS.slice(-S_open)  — top S_open values
//   R(t)   = min(30, t - 1)  — risk bonus
//   score  = pool[winningGreen] + R(t)  — on survive

/** Fixed ascending value table. 31 entries; 1..70 with sparse top. */
export const BASE_SLOTS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  14, 16, 18, 20, 22, 25, 28, 31, 35, 39, 43, 47,
  51, 55, 59, 63, 66, 68, 70,
] as const;

/** 1-based interval index since 08:00 IST, derived from current ballsDropped. */
export function intervalIndexFromBalls(ballsDropped: number): number {
  // ballsDropped = max(2, 32 - elapsed)  →  elapsed = 32 - ballsDropped (>=0)
  //                                      →  t = elapsed + 1
  return Math.max(1, Math.min(32, 33 - ballsDropped));
}

/** Risk bonus R(t) = t - 1, clamped to [0, 30]. */
export function riskBonusFromT(t: number): number {
  return Math.max(0, Math.min(30, t - 1));
}

/** Top S_open values from BASE_SLOTS (low values pruned as the day advances). */
export function prunedPool(ballsDropped: number): number[] {
  const sOpen = Math.max(1, ballsDropped - 1);
  return BASE_SLOTS.slice(-sOpen);
}

/** Fisher-Yates shuffle of the pruned pool. Caller may inject a seeded RNG. */
export function assignSlotPoints(
  ballsDropped: number,
  rng: () => number = Math.random,
): number[] {
  const pool = prunedPool(ballsDropped).slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}
