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
