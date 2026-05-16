"use client";

export type ForceOutcome = "" | "survive" | "death";

export function DevPanel({
  forceOutcome,
  setForceOutcome,
  mockHour,
  setMockHour,
  onResetLockout,
}: {
  forceOutcome: ForceOutcome;
  setForceOutcome: (v: ForceOutcome) => void;
  mockHour: number | null;
  setMockHour: (v: number | null) => void;
  onResetLockout: () => void;
}) {
  return (
    <div
      dir="ltr"
      className="fixed top-3 left-3 z-[60] w-[260px] bg-yellow-200/95 border-[3px] border-ink shadow-[-4px_4px_0_0_#0A0A0A] p-3 font-rubik text-xs flex flex-col items-stretch gap-2"
    >
      <span className="font-black uppercase tracking-wider text-xs bg-ink text-yellow-200 px-2 py-1">
        DEV
      </span>

      <button
        onClick={onResetLockout}
        className="border-2 border-ink bg-white px-3 py-1 font-bold shadow-[-2px_2px_0_0_#0A0A0A] active:translate-x-[-2px] active:translate-y-[2px] active:shadow-none"
      >
        🔄 Reset Play Lockout
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
