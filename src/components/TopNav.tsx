"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",            label: "המשחק",  emoji: "🎲" },
  { href: "/leaderboard", label: "טבלת המובילים", emoji: "🏆" },
];

export function TopNav({ onOpenManifesto }: { onOpenManifesto?: () => void }) {
  const pathname = usePathname() ?? "/";
  return (
    <header
      dir="rtl"
      className="hidden md:block sticky top-0 z-30 bg-white border-b-4 border-ink shadow-[0_4px_0_0_#0A0A0A]"
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between font-rubik">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <span className="font-black text-2xl tracking-tight">לשרוד את היום</span>
        </Link>
        <nav className="flex gap-2 items-center">
          {LINKS.map(l => {
            const isActive = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={[
                  "px-4 py-2 border-2 border-ink rounded-lg font-bold text-sm transition-transform",
                  isActive
                    ? "bg-[#106B01] text-white shadow-[3px_3px_0_0_#0A0A0A]"
                    : "bg-white text-ink hover:bg-[#F9FAFB] shadow-[2px_2px_0_0_#0A0A0A] active:translate-x-[-2px] active:translate-y-[2px] active:shadow-none",
                ].join(" ")}
              >
                <span aria-hidden className="ml-1">{l.emoji}</span>
                {l.label}
              </Link>
            );
          })}
          {onOpenManifesto && (
            <button
              onClick={onOpenManifesto}
              aria-label="איך משחקים"
              title="איך משחקים?"
              className="w-10 h-10 border-2 border-ink rounded-lg font-black text-lg bg-white shadow-[2px_2px_0_0_#0A0A0A] active:translate-x-[-2px] active:translate-y-[2px] active:shadow-none transition-transform"
            >
              ?
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
