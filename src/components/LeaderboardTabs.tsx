"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MyGroupsResponse } from "@/app/api/me/groups/route";

type Mode = "national" | "groups" | "friends";

interface Props {
  currentGroupSlug: string | null;
  isAuthed: boolean;
}

export function LeaderboardTabs({ currentGroupSlug, isAuthed }: Props) {
  const router = useRouter();
  const [myGroups, setMyGroups] = useState<MyGroupsResponse["groups"] | null>(null);

  // Tab state derives from URL: a selected group means we're in the groups tab.
  const [mode, setMode] = useState<Mode>(currentGroupSlug ? "groups" : "national");
  useEffect(() => {
    setMode(currentGroupSlug ? "groups" : "national");
  }, [currentGroupSlug]);

  // Lazy-fetch the user's groups when the tab is first opened (or on mount if
  // we're already on a group URL so the chip strip is populated).
  useEffect(() => {
    if (mode !== "groups" || myGroups !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/groups", { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as MyGroupsResponse;
          if (!cancelled) setMyGroups(json.groups);
        } else if (!cancelled) {
          setMyGroups([]);
        }
      } catch {
        if (!cancelled) setMyGroups([]);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, myGroups]);

  const tabs = useMemo(
    () =>
      [
        { key: "national" as const, label: "ארצי", enabled: true },
        { key: "groups" as const, label: "קבוצות", enabled: true },
        { key: "friends" as const, label: "חברים", enabled: false },
      ],
    [],
  );

  const handleTab = (key: Mode) => {
    if (key === "national") {
      setMode("national");
      router.push("/leaderboard");
    } else if (key === "groups") {
      setMode("groups");
      // Don't update URL yet — only when a chip is picked. If we already have
      // one cached, jump to it for one-click convenience.
      if (currentGroupSlug) return;
    }
  };

  return (
    <div dir="rtl" className="flex flex-col gap-2">
      {/* Tab row */}
      <div className="flex gap-2 font-rubik">
        {tabs.map(t => {
          const isActive = mode === t.key;
          return (
            <button
              key={t.key}
              disabled={!t.enabled}
              onClick={() => t.enabled && handleTab(t.key)}
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
              {!t.enabled && (
                <span className="block text-[10px] font-bold opacity-70">בקרוב</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Groups picker (only when groups tab is active) */}
      {mode === "groups" && (
        <div className="mt-1 px-1 pb-1">
          {!isAuthed && (
            <p className="text-xs font-bold text-gray-concrete text-center py-2">
              חזור למשחק והתחבר כדי לראות חבורות.
            </p>
          )}

          {isAuthed && myGroups === null && (
            <p className="text-xs font-bold text-gray-concrete text-center py-2">טוען חבורות…</p>
          )}

          {isAuthed && myGroups && myGroups.length === 0 && (
            <p className="text-xs font-bold text-gray-concrete text-center py-2">
              אין לך עדיין חבורות.{" "}
              <Link href="/account" className="underline hover:text-[#106B01]">
                פתח חבורה באזור האישי
              </Link>
              .
            </p>
          )}

          {isAuthed && myGroups && myGroups.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {myGroups.map(g => {
                const isSelected = currentGroupSlug === g.slug;
                return (
                  <button
                    key={g.id}
                    onClick={() => router.push(`/leaderboard?group=${g.slug}`)}
                    className={[
                      "px-3 py-1.5 border-2 border-ink rounded-full font-bold text-xs transition-transform",
                      isSelected
                        ? "bg-[#FFDB40] text-ink shadow-[2px_2px_0_0_#0A0A0A] -translate-y-0.5"
                        : "bg-white text-ink hover:bg-[#F9FAFB] active:translate-y-0.5",
                    ].join(" ")}
                  >
                    👥 {g.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
