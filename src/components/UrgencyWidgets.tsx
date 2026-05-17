"use client";

import { useEffect, useState } from "react";
import { minutesUntilNextDrop, survivalChanceFromBalls } from "@/lib/time";
import type { RecentActivityResponse } from "@/app/api/recent-activity/route";

// ─────────────────────────────────────────────────────────────────────────────
// Survival Chance card

export function SurvivalChance({ ballsDropped }: { ballsDropped: number }) {
  const pct = survivalChanceFromBalls(ballsDropped) * 100;
  return (
    <div
      dir="rtl"
      className="bg-white border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] rounded-xl p-4 font-rubik flex flex-col items-center justify-center"
    >
      <div className="text-xs font-bold text-gray-concrete uppercase tracking-wider mb-1">
        סיכויי הישרדות
      </div>
      <div className="font-black text-4xl text-[#106B01] tabular-nums">
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Next-wheel countdown card

export function NextWheelCountdown() {
  const [mins, setMins] = useState<number>(() => minutesUntilNextDrop());
  useEffect(() => {
    const id = window.setInterval(() => setMins(minutesUntilNextDrop()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const segmentProgress = ((30 - mins) / 30) * 100;
  return (
    <div
      dir="rtl"
      className="bg-white border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] rounded-xl p-4 font-rubik flex flex-col items-center justify-center gap-2"
    >
      <div className="text-xs font-bold text-gray-concrete uppercase tracking-wider">
        החלפת גלגל הבאה
      </div>
      <div className="w-full h-3 bg-[#F9FAFB] border-2 border-ink rounded-full overflow-hidden">
        <div
          className="h-full bg-[#106B01] transition-[width] duration-700"
          style={{ width: `${Math.min(100, Math.max(2, segmentProgress))}%` }}
        />
      </div>
      <div className="text-sm font-bold text-ink tabular-nums">
        {mins > 0 ? `עוד ${mins} דקות` : "ההחלפה הבאה: 08:00"}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical risk gauge — sits beside the wheel showing how lethal "now" is

export function RiskGauge({ ballsDropped }: { ballsDropped: number }) {
  const deathPct = (1 - survivalChanceFromBalls(ballsDropped)) * 100;
  // Color by tier
  const tierColor =
    deathPct < 15 ? "#22C55E" : deathPct < 30 ? "#A3E635" : deathPct < 45 ? "#F59E0B" : "#DC2626";
  const tierLabel =
    deathPct < 15 ? "קלילה" : deathPct < 30 ? "בינונית" : deathPct < 45 ? "גבוהה" : "פסיכופת";

  return (
    <div
      dir="rtl"
      className="font-rubik flex flex-col items-center gap-2 select-none"
      aria-label={`רמת סיכון: ${tierLabel}`}
    >
      <div className="text-[10px] font-black uppercase tracking-widest text-gray-concrete">
        סיכון
      </div>
      <div
        className="relative w-7 h-56 bg-white border-2 border-ink rounded-full overflow-hidden shadow-[4px_4px_0_0_#0A0A0A]"
      >
        {/* Fill from bottom — height represents current death odds */}
        <div
          className="absolute inset-x-0 bottom-0 transition-all duration-700"
          style={{ height: `${Math.min(100, deathPct)}%`, backgroundColor: tierColor }}
        />
        {/* Tick marks */}
        {[25, 50, 75].map(t => (
          <div
            key={t}
            className="absolute inset-x-0 border-t border-ink/40"
            style={{ bottom: `${t}%` }}
          />
        ))}
      </div>
      <div className="text-xs font-black text-ink whitespace-nowrap" style={{ color: tierColor }}>
        {tierLabel}
      </div>
      <div className="text-[10px] font-bold text-gray-concrete tabular-nums">
        {deathPct.toFixed(0)}%
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live feed of recent plays (polls every 30s)

function timeAgo(iso: string, now: Date): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now.getTime() - t);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  return `לפני ${hours} שע׳`;
}

export function LiveFeed() {
  const [data, setData] = useState<RecentActivityResponse | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/recent-activity", { cache: "no-store" });
        if (res.ok) setData(await res.json());
      } catch {}
    };
    fetchData();
    const poll = window.setInterval(fetchData, 30_000);
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => { window.clearInterval(poll); window.clearInterval(tick); };
  }, []);

  return (
    <div
      dir="rtl"
      className="bg-white border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] rounded-xl p-4 font-rubik"
    >
      <div className="flex items-baseline justify-between mb-3 border-b-2 border-ink pb-2">
        <h3 className="font-black text-lg">נפילות חיות</h3>
        <span className="text-xs font-bold text-gray-concrete tabular-nums">
          {data ? `${data.totalToday} שיחקו היום` : "טוען…"}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {!data && (
          <li className="text-sm font-bold text-gray-concrete">טוען…</li>
        )}
        {data && data.plays.length === 0 && (
          <li className="text-sm font-bold text-gray-concrete">
            עוד אף אחד לא שיחק היום. תהיה הראשון.
          </li>
        )}
        {data?.plays.map((p, i) => (
          <li
            key={`${p.playedAt}-${i}`}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full border border-ink shrink-0"
                style={{ backgroundColor: p.outcome === "survive" ? "#22C55E" : "#DC2626" }}
              />
              <span className="font-bold truncate">{p.display}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 tabular-nums">
              <span
                className="text-xs font-black"
                style={{ color: p.outcome === "survive" ? "#106B01" : "#DC2626" }}
              >
                {p.outcome === "survive" ? "✓ שרד" : "💀 נפל"}
              </span>
              <span className="text-xs text-gray-concrete font-bold">
                {timeAgo(p.playedAt, now)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
