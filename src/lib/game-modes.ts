import type { GameMode } from "@/components/GameModeTabs";

interface GameModeMeta {
  label: string;
  glyph: string;
}

export const GAME_MODE_META: Record<GameMode, GameModeMeta> = {
  wheel: { label: "גלגל הגורלות", glyph: "🎡" },
  cards: { label: "קלפים", glyph: "🃏" },
  cups:  { label: "כוסות", glyph: "🥤" },
  wires: { label: "חוטים", glyph: "🔌" },
};

export function gameModeLabel(mode: GameMode): string {
  return GAME_MODE_META[mode]?.label ?? "משחק";
}

export function gameModeGlyph(mode: GameMode): string {
  return GAME_MODE_META[mode]?.glyph ?? "🎲";
}

// Per-game narrative lines used on the OutcomeModal as the lead description
// of what just happened. The reasonText from CONTENT.json remains the
// cynical "why" — these are the cinematic "what".
export const OUTCOME_MESSAGES: Record<GameMode, { survive: string; death: string }> = {
  wheel: {
    survive: "החץ פספס אותך במילימטר. תחזור לנשום, יש לך עוד יום שלם להעביר במשרד.",
    death:   "הגלגל נעצר על אדום. יום קשוח, המזל שלך נגמר רשמית. תתחיל לארוז מנטלית.",
  },
  cards: {
    survive: "שלפת את האס הירוק. הג'וקר האדום נשאר בחפיסה, אבל אל תפתח ביטחון עצמי מופרז.",
    death:   "הפכת את הג'וקר האדום. הבית תמיד מנצח, והיום הבית החליט למחוק אותך.",
  },
  cups: {
    survive: "הרמת את הכוס הנכונה והכדור הירוק שם. הפעם הקוסם הפסיד, הרווחת עוד יום.",
    death:   "הכוס התרוממה וחשפה גולגולת. הימור גרוע, הבלוף שלך נחשף.",
  },
  wires: {
    survive: "קליק. החוט נגזר והמסך נשאר ירוק. נשארת בחיים, גיבור של חדרים אטומים.",
    death:   "בום. גזרת את החוט הממולכד. עשן, ניצוצות, ויום שהלך לעזאזל. נתראה מחר.",
  },
};

export function outcomeMessage(mode: GameMode, outcome: "survive" | "death"): string {
  return OUTCOME_MESSAGES[mode]?.[outcome] ?? "";
}
