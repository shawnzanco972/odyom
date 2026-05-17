"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
  emoji: string;
}

const TABS: Tab[] = [
  { href: "/",            label: "גורל",   emoji: "🎲" },
  { href: "/leaderboard", label: "טבלה",   emoji: "🏆" },
  { href: "/account",     label: "חשבון",  emoji: "👤" }, // placeholder for now
];

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] z-40 bg-white border-t-4 border-ink rounded-t-xl shadow-[0_-4px_0_0_#0A0A0A] flex justify-around items-center px-4 pt-2 pb-5 font-rubik"
    >
      {TABS.map(tab => {
        const isActive = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
        const isPlaceholder = tab.href === "/account";
        const content = (
          <div
            className={[
              "flex flex-col items-center px-4 py-1 rounded-lg transition-transform",
              isActive
                ? "bg-survive text-white border-2 border-ink -translate-y-1 shadow-[2px_2px_0_0_#0A0A0A]"
                : "text-gray-concrete hover:bg-bgsoft active:translate-y-1",
              isPlaceholder ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
          >
            <span className="text-2xl leading-none">{tab.emoji}</span>
            <span className="font-bold text-xs mt-1">{tab.label}</span>
          </div>
        );
        if (isPlaceholder) {
          return (
            <div key={tab.href} title="בקרוב">{content}</div>
          );
        }
        return (
          <Link key={tab.href} href={tab.href}>{content}</Link>
        );
      })}
    </nav>
  );
}
