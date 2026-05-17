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
