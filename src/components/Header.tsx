"use client";
import Link from "next/link";

export function Header({
  streak,
  score,
  clock,
  onOpenManifesto,
}: {
  streak: number;
  score: number;
  clock: string;
  onOpenManifesto?: () => void;
}) {
  return (
    <header
      dir="rtl"
      className="w-full max-w-3xl mx-auto flex items-center justify-between gap-2 px-4 py-3 border-b-[3px] border-ink bg-white"
    >
      {/* Right side (RTL leading): streak chip */}
      <div className="font-rubik font-black text-sm sm:text-base border-[3px] border-ink px-2.5 py-1 bg-bgsoft shadow-[-4px_4px_0_0_#0A0A0A]">
        🔥 רצף: {streak}
      </div>

      {/* Center: clock */}
      <div className="font-rubik font-black text-sm sm:text-base tracking-wider">
        {clock}
      </div>

      {/* Left side (RTL trailing): score + help button */}
      <div className="flex items-center gap-2">
        <Link
          href="/leaderboard"
          className="font-rubik font-black text-sm sm:text-base border-[3px] border-ink px-2.5 py-1 bg-bgsoft shadow-[-4px_4px_0_0_#0A0A0A] hover:bg-[#FEF9C3] transition-colors"
          title="טבלת המובילים"
        >
          🏆 {score.toLocaleString("he-IL")}
        </Link>
        {onOpenManifesto && (
          <button
            onClick={onOpenManifesto}
            aria-label="איך משחקים"
            title="איך משחקים?"
            className="font-rubik font-black text-lg w-9 h-9 border-[3px] border-ink bg-white shadow-[-4px_4px_0_0_#0A0A0A] active:translate-x-[-4px] active:translate-y-[4px] active:shadow-none transition-transform"
          >
            ?
          </button>
        )}
      </div>
    </header>
  );
}
