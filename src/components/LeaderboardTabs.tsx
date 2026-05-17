"use client";
import { useState } from "react";

type Tab = "national" | "groups" | "friends";

const tabs: { key: Tab; label: string; enabled: boolean }[] = [
  { key: "national", label: "ארצי", enabled: true },
  { key: "groups",   label: "קבוצות", enabled: false },
  { key: "friends",  label: "חברים", enabled: false },
];

export function LeaderboardTabs() {
  const [active, setActive] = useState<Tab>("national");
  return (
    <div dir="rtl" className="flex gap-2 font-rubik">
      {tabs.map(t => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            disabled={!t.enabled}
            onClick={() => t.enabled && setActive(t.key)}
            title={t.enabled ? undefined : "בקרוב"}
            className={[
              "flex-1 py-3 px-2 border-2 border-ink rounded-lg font-bold text-sm transition-transform",
              isActive
                ? "bg-[#106B01] text-white shadow-[2px_2px_0_0_#0A0A0A] -translate-y-0.5"
                : "bg-white text-ink hover:bg-[#F9FAFB] active:translate-y-0.5",
              !t.enabled ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
          >
            {t.label}
            {!t.enabled && <span className="block text-[10px] font-bold opacity-70">בקרוב</span>}
          </button>
        );
      })}
    </div>
  );
}
