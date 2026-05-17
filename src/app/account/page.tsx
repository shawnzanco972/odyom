"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { TopNav } from "@/components/TopNav";
import { Header } from "@/components/Header";
import { NicknameEditor } from "@/components/NicknameEditor";
import { LinkGoogleButton } from "@/components/LinkGoogleButton";
import { SuggestionTrigger } from "@/components/SuggestionTrigger";
import { ShareButton } from "@/components/ShareButton";
import { SignOutButton } from "@/components/SignOutButton";
import { GroupsSection } from "@/components/GroupsSection";
import type { PlayRow } from "@/lib/supabase/types";

function timeAgoHe(iso: string, now: Date): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now.getTime() - t);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
}

function StatTile({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div
      dir="rtl"
      className="bg-white border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] rounded-xl p-4 flex flex-col items-center text-center font-rubik"
    >
      <div className="text-3xl mb-1" aria-hidden>{icon}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-concrete">
        {label}
      </div>
      <div className="font-black text-2xl text-ink tabular-nums">{value}</div>
    </div>
  );
}

export default function AccountPage() {
  const { session, userRow, loading } = useUser();
  const [plays, setPlays] = useState<PlayRow[] | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const res = await fetch("/api/me/plays", { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as { plays: PlayRow[] };
          setPlays(json.plays);
        }
      } catch {}
    })();
  }, [session]);

  const isAnon = session?.user?.is_anonymous === true;
  const email = session?.user?.email ?? null;
  const display = userRow?.nickname?.trim() || userRow?.username || "ישראלי";
  const initial = display.charAt(0);

  return (
    <div
      dir="rtl"
      style={{ backgroundColor: "#F9FAFB" }}
      className="min-h-screen pb-28 md:pb-12"
    >
      <TopNav />
      <div className="md:hidden">
        <Header
          streak={userRow?.current_streak ?? 0}
          score={userRow?.total_score ?? 0}
          clock={new Date().toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false })}
        />
      </div>

      <main className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-6 md:pt-10 font-rubik flex flex-col gap-6">
        {/* Identity header */}
        <header className="flex items-center gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-[#106B01] text-white border-[3px] border-ink shadow-[-4px_4px_0_0_#0A0A0A] flex items-center justify-center font-black text-3xl md:text-4xl uppercase">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="font-black text-2xl md:text-4xl tracking-tight truncate"
              style={{ textShadow: "3px 3px 0 #ffffff" }}
            >
              {display}
            </h1>
            <div className="mt-1 flex flex-wrap gap-2 items-center">
              {isAnon ? (
                <span className="inline-block bg-white border-2 border-ink px-2 py-0.5 text-xs font-bold">
                  👤 אנונימי
                </span>
              ) : (
                <span className="inline-block bg-[#106B01] text-white border-2 border-ink px-2 py-0.5 text-xs font-bold">
                  ✓ {email ?? "מחובר"}
                </span>
              )}
              {userRow?.madness_tag && (
                <span className="inline-block bg-ink text-white px-2 py-0.5 text-xs font-bold">
                  {userRow.madness_tag}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Account backup banner — only for anon users */}
        {isAnon && <LinkGoogleButton />}

        {/* Stats grid */}
        <section>
          <h2 className="font-black text-lg mb-3">המספרים שלך</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile icon="🔥" label="רצף נוכחי" value={userRow?.current_streak ?? 0} />
            <StatTile icon="🏆" label="שיא" value={userRow?.highest_streak ?? 0} />
            <StatTile icon="🎲" label="ניקוד" value={(userRow?.total_score ?? 0).toLocaleString("he-IL")} />
            <StatTile icon="🃏" label="תג" value={userRow?.madness_tag ?? "—"} />
          </div>
        </section>

        {/* 2-col on desktop: history (left) + actions (right) */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-5">
          {/* History */}
          <section className="bg-white border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] rounded-xl p-4">
            <div className="flex items-baseline justify-between mb-3 border-b-2 border-ink pb-2">
              <h2 className="font-black text-lg">יומן הסבל שלך</h2>
              <span className="text-xs font-bold text-gray-concrete">
                {plays ? `${plays.length} משחקים` : ""}
              </span>
            </div>
            {!plays && (
              <p className="text-sm font-bold text-gray-concrete">טוען…</p>
            )}
            {plays && plays.length === 0 && (
              <p className="text-sm font-bold text-gray-concrete">
                שקט פה מדי... נראה שלא העזת לסובב את הגלגל היום. ממה אתה מפחד?
              </p>
            )}
            <ul className="flex flex-col gap-2 list-none p-0 max-h-[480px] overflow-y-auto">
              {plays?.map(p => (
                <li
                  key={p.id}
                  className="flex items-start gap-3 border-b border-ink/15 pb-2 last:border-0"
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full border border-ink shrink-0 mt-1.5"
                    style={{ backgroundColor: p.outcome === "survive" ? "#22C55E" : "#DC2626" }}
                    aria-label={p.outcome === "survive" ? "שרד" : "נפל"}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink leading-snug">{p.reason}</p>
                    <div className="flex gap-2 items-center mt-1 text-[11px] font-bold text-gray-concrete">
                      <span>{timeAgoHe(p.played_at, now)}</span>
                      <span>·</span>
                      <span>{p.outcome === "survive" ? "שרד" : "נפל"}</span>
                      {p.streak_at_play > 0 && p.outcome === "survive" && (
                        <>
                          <span>·</span>
                          <span>🔥 {p.streak_at_play}</span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Actions sidebar */}
          <aside className="flex flex-col gap-4">
            <NicknameEditor />

            {/* Referral / rescue */}
            <div className="bg-white border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] rounded-xl p-4">
              <h3 className="font-black text-base mb-1">הזמן חבר, הציל את הסטריק</h3>
              <p className="text-xs text-gray-concrete font-bold mb-3">
                כל חבר חדש שייכנס דרך הלינק שלך יחיה את הרצף שלך.
              </p>
              <ShareButton
                outcome="survive"
                streak={userRow?.current_streak ?? 0}
                reason="שרוד את היום איתי - גלגל יומי של מציאות ישראלית."
                referrerId={session?.user?.id ?? null}
                compact
                className="w-full"
              />
            </div>

            {/* Suggestion */}
            <div className="bg-white border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A] rounded-xl p-4">
              <h3 className="font-black text-base mb-1">הצע משפט לגלגל</h3>
              <p className="text-xs text-gray-concrete font-bold mb-3">
                חושב שאתה יותר מצחיק מאיתנו? תוכיח.
              </p>
              <SuggestionTrigger />
            </div>

            {/* Groups */}
            <GroupsSection isAnon={isAnon} />

            {/* Sign-out (Google-linked only) */}
            {!loading && !isAnon && (
              <div className="flex justify-end">
                <SignOutButton />
              </div>
            )}
          </aside>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
