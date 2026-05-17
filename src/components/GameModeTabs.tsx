"use client";

export type GameMode = "wheel" | "cards" | "cups" | "wires";

const TABS: { id: GameMode; label: string; glyph: string }[] = [
  { id: "wheel", label: "גלגל", glyph: "🎡" },
  { id: "cards", label: "קלפים", glyph: "🃏" },
  { id: "cups", label: "כוסות", glyph: "🥤" },
  { id: "wires", label: "חוטים", glyph: "🔌" },
];

export function GameModeTabs({
  active,
  onChange,
  disabled = false,
}: {
  active: GameMode;
  onChange: (m: GameMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="בחר מצב משחק"
      className="w-full max-w-md grid grid-cols-4 gap-2 font-rubik"
      dir="rtl"
    >
      {TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-pressed={isActive}
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onChange(t.id)}
            className={[
              "flex flex-col items-center justify-center gap-1 py-2 px-1",
              "border-[3px] border-[#0A0A0A] font-black text-sm",
              "transition-transform active:translate-x-[1px] active:translate-y-[1px]",
              isActive
                ? "bg-[#0A0A0A] text-white shadow-[0_0_0_0_#0A0A0A]"
                : "bg-white text-[#0A0A0A] shadow-[3px_3px_0_0_#0A0A0A]",
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            <span className="text-xl leading-none">{t.glyph}</span>
            <span className="leading-none">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
