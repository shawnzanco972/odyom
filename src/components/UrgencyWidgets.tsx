"use client";

import { useEffect, useState } from "react";
import { minutesUntilNextDrop, survivalChanceFromBalls } from "@/lib/time";
import type { RecentActivityResponse } from "@/app/api/recent-activity/route";

// ─────────────────────────────────────────────────────────────────────────────
// Community Survival Index — live DB-driven percentage of survivors today

export function CommunitySurvivalIndex() {
  const [data, setData] = useState<{ survivorsToday: number; totalToday: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/recent-activity", { cache: "no-store" });
        if (res.ok) {
          const j = (await res.json()) as RecentActivityResponse;
          setData({ survivorsToday: j.survivorsToday, totalToday: j.totalToday });
        }
      } catch {}
    };
    fetchData();
    const id = window.setInterval(fetchData, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const pct =
    data && data.totalToday > 0
      ? Math.round((data.survivorsToday / data.totalToday) * 100)
      : null;

  return (
    <div
      dir="rtl"
      className="bg-white border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] rounded-xl p-4 font-rubik flex flex-col items-center justify-center"
    >
      <div className="text-xs font-bold text-gray-concrete uppercase tracking-wider mb-1">
        מדד השורדים
      </div>
      <div className="font-black text-2xl md:text-3xl text-ink text-center tabular-nums">
        {pct === null ? "טוען…" : (
          <>
            <span className="text-[#106B01]">{pct}%</span>{" "}
            מהישראלים שרדו את היום 🛡️
          </>
        )}
      </div>
      {data && data.totalToday > 0 && (
        <div className="text-[11px] font-bold text-gray-concrete mt-1 tabular-nums">
          {data.survivorsToday} מתוך {data.totalToday}
        </div>
      )}
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

// Global mapping: actual server risk of 0.5 (50%) maps to a fully bleeding gauge.
// visualPercentage = (actualRisk / 0.5) * 100
export function riskToVisualPercent(actualRisk: number): number {
  return Math.min(100, Math.max(0, (actualRisk / 0.5) * 100));
}

export function RiskGauge({
  ballsDropped,
  orientation = "vertical",
}: {
  ballsDropped: number;
  orientation?: "vertical" | "horizontal";
}) {
  const actualRisk = 1 - survivalChanceFromBalls(ballsDropped);
  const visualPct = riskToVisualPercent(actualRisk);
  const tierColor =
    visualPct < 30 ? "#22C55E" : visualPct < 60 ? "#A3E635" : visualPct < 90 ? "#F59E0B" : "#DC2626";
  const tierLabel =
    visualPct < 30 ? "קלילה" : visualPct < 60 ? "בינונית" : visualPct < 90 ? "גבוהה" : "פסיכופת";

  if (orientation === "horizontal") {
    return (
      <div
        dir="rtl"
        className="font-rubik w-full flex items-center gap-3 select-none"
        aria-label={`רמת סיכון: ${tierLabel}`}
      >
        <div className="text-[10px] font-black uppercase tracking-widest text-gray-concrete shrink-0">
          סיכון
        </div>
        <div className="relative flex-1 h-4 bg-white border-2 border-ink rounded-full overflow-hidden shadow-[3px_3px_0_0_#0A0A0A]">
          <div
            className="absolute inset-y-0 right-0 transition-all duration-700"
            style={{ width: `${visualPct}%`, backgroundColor: tierColor }}
          />
          {[25, 50, 75].map(t => (
            <div
              key={t}
              className="absolute inset-y-0 border-r border-ink/40"
              style={{ right: `${t}%` }}
            />
          ))}
        </div>
        <div className="text-xs font-black whitespace-nowrap shrink-0" style={{ color: tierColor }}>
          {tierLabel}
        </div>
      </div>
    );
  }

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
        <div
          className="absolute inset-x-0 bottom-0 transition-all duration-700"
          style={{ height: `${visualPct}%`, backgroundColor: tierColor }}
        />
        {[25, 50, 75].map(t => (
          <div
            key={t}
            className="absolute inset-x-0 border-t border-ink/40"
            style={{ bottom: `${t}%` }}
          />
        ))}
      </div>
      <div className="text-xs font-black whitespace-nowrap" style={{ color: tierColor }}>
        {tierLabel}
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
