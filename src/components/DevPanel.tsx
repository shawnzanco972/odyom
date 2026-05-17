"use client";

import { useState } from "react";

export type ForceOutcome = "" | "survive" | "death";

export function DevPanel({
  forceOutcome,
  setForceOutcome,
  mockHour,
  setMockHour,
  onResetLockout,
  onWiped,
}: {
  forceOutcome: ForceOutcome;
  setForceOutcome: (v: ForceOutcome) => void;
  mockHour: number | null;
  setMockHour: (v: number | null) => void;
  onResetLockout: () => void;
  onWiped?: () => void;
}) {
  const [wiping, setWiping] = useState(false);
  const handleWipe = async () => {
    if (!window.confirm("Wipe your score, streak, and play history? Username stays. Cannot be undone.")) return;
    setWiping(true);
    try {
      const res = await fetch("/api/dev/wipe-me", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as { error?: string }));
        window.alert(`Wipe failed: ${j.error ?? res.status}`);
        return;
      }
      const { deletedPlays } = (await res.json()) as { deletedPlays: number };
      window.alert(`Wiped. Deleted ${deletedPlays} play row(s). Reload to refresh.`);
      onWiped?.();
    } finally {
      setWiping(false);
    }
  };
  return (
    <div
      dir="ltr"
      className="fixed top-3 left-3 z-[80] w-[260px] bg-yellow-200/95 border-[3px] border-ink shadow-[-4px_4px_0_0_#0A0A0A] p-3 font-rubik text-xs flex flex-col items-stretch gap-2"
    >
      <span className="font-black uppercase tracking-wider text-xs bg-ink text-yellow-200 px-2 py-1">
        DEV
      </span>
      <span className="text-[10px] text-gray-700 leading-tight">
        Localhost only. Force/hour overrides are silently ignored on prod
        unless NEXT_PUBLIC_DEV_MODE=true is set in Vercel.
      </span>

      <button
        onClick={onResetLockout}
        className="border-2 border-ink bg-white px-3 py-1 font-bold shadow-[-2px_2px_0_0_#0A0A0A] active:translate-x-[-2px] active:translate-y-[2px] active:shadow-none"
      >
        🔄 Reset Play Lockout
      </button>

      <button
        onClick={handleWipe}
        disabled={wiping}
        className="border-2 border-ink bg-[#FECACA] text-[#7F1D1D] px-3 py-1 font-bold shadow-[-2px_2px_0_0_#0A0A0A] active:translate-x-[-2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
      >
        {wiping ? "Wiping…" : "🧹 Wipe my stats + plays"}
      </button>

      <label className="flex items-center gap-2 font-bold">
        Force outcome:
        <select
          value={forceOutcome}
          onChange={e => setForceOutcome(e.target.value as ForceOutcome)}
          className="border-2 border-ink bg-white px-2 py-1 font-bold"
        >
          <option value="">Default (random)</option>
          <option value="survive">Force SURVIVAL</option>
          <option value="death">Force DEATH</option>
        </select>
      </label>

      <label className="flex items-center gap-2 font-bold">
        Mock IST hour:
        <input
          type="range"
          min={7}
          max={23}
          step={1}
          value={mockHour ?? 12}
          onChange={e => setMockHour(Number(e.target.value))}
          className="accent-black"
        />
        <span className="tabular-nums w-10 text-right">
          {mockHour === null ? "—" : `${String(mockHour).padStart(2, "0")}:00`}
        </span>
        <button
          onClick={() => setMockHour(null)}
          className="border-2 border-ink bg-white px-2 py-0.5 text-xs font-bold"
        >
          clear
        </button>
      </label>
    </div>
  );
}
