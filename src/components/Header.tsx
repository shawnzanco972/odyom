"use client";
import Link from "next/link";

export function Header({
  streak,
  score,
  clock,
}: {
  streak: number;
  score: number;
  clock: string;
}) {
  return (
    <header className="w-full max-w-3xl mx-auto flex items-center justify-between gap-3 px-4 py-3 border-b-[3px] border-ink bg-white">
      <div className="font-rubik font-black text-base sm:text-lg border-[3px] border-ink px-3 py-1 bg-bgsoft shadow-[-4px_4px_0_0_#0A0A0A]">
        🔥 רצף: {streak} ימים
      </div>
      <div className="font-rubik font-black text-base sm:text-lg tracking-wider">
        שעה: {clock}
      </div>
      <Link
        href="/leaderboard"
        className="font-rubik font-black text-base sm:text-lg border-[3px] border-ink px-3 py-1 bg-bgsoft shadow-[-4px_4px_0_0_#0A0A0A] hover:bg-[#FEF9C3] transition-colors"
        title="טבלת המובילים"
      >
        🏆 {score.toLocaleString("he-IL")} נק׳
      </Link>
    </header>
  );
}
