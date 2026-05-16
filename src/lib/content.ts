import content from "../../public/content.json";

type SurviveBank = { tier1: string[]; tier2: string[]; tier3: string[]; tier4: string[] };
type ContentShape = { survive: SurviveBank; death: string[] };
const bank = content as ContentShape;

// Map IST hour → tier (rough escalation of cynicism through the day).
export function tierForHour(h: number): keyof SurviveBank {
  if (h < 11) return "tier1";
  if (h < 15) return "tier2";
  if (h < 19) return "tier3";
  return "tier4";
}

export function pickSurvive(hour: number): string {
  const arr = bank.survive[tierForHour(hour)];
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickDeath(): string {
  const arr = bank.death;
  return arr[Math.floor(Math.random() * arr.length)];
}
