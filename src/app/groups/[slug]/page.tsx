"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/AuthProvider";
import { BottomNav } from "@/components/BottomNav";
import { TopNav } from "@/components/TopNav";
import { BrutalButton } from "@/components/BrutalButton";
import { buildGroupInviteText, shareOrCopy } from "@/lib/share";
import type { GroupDetailsResponse } from "@/app/api/groups/[slug]/route";

export default function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { session } = useUser();
  const [data, setData] = useState<GroupDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${slug}`, { cache: "no-store" });
      if (res.status === 404) { setData(null); setLoading(false); return; }
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }, [slug]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleJoin = async () => {
    if (!session) return;
    setBusy(true);
    const res = await fetch(`/api/groups/${slug}/join`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      window.alert("ברוך הבא לזירה! הצטרפת לקבוצה בהצלחה.");
      await fetchData();
    } else {
      window.alert("הצטרפות נכשלה.");
    }
  };

  const handleShare = async () => {
    if (!data) return;
    const text = buildGroupInviteText(data.name, data.slug);
    const url = `${window.location.origin}/groups/${data.slug}`;
    const r = await shareOrCopy(text, url);
    if (r === "shared") setShareStatus("שותף ✓");
    else if (r === "copied") setShareStatus("הועתק! ✓");
    else setShareStatus(null);
    if (r !== "failed") window.setTimeout(() => setShareStatus(null), 1800);
  };

  return (
    <div
      dir="rtl"
      style={{ backgroundColor: "#F1FDE7" }}
      className="min-h-screen pb-28 md:pb-12"
    >
      <TopNav />

      <main className="w-full max-w-4xl mx-auto px-4 md:px-8 pt-6 md:pt-10 font-rubik flex flex-col gap-6">
        {/* Header */}
        <Link href="/account" className="font-bold text-sm underline self-start">
          ← לאזור האישי
        </Link>

        {loading && <p className="text-center font-bold text-gray-concrete py-12">טוען…</p>}

        {!loading && !data && (
          <div className="text-center py-12">
            <h1 className="font-black text-3xl mb-2">קבוצה לא נמצאה 😶</h1>
            <p className="font-bold text-gray-concrete mb-6">או שהיא נמחקה, או שהלינק שגוי.</p>
            <Link href="/account">
              <BrutalButton variant="ink">חזור לאזור האישי</BrutalButton>
            </Link>
          </div>
        )}

        {data && (
          <>
            {/* Group hero */}
            <header className="flex flex-col items-center gap-2 text-center">
              <h1
                className="font-black text-4xl md:text-5xl uppercase tracking-tighter text-ink leading-none"
                style={{ textShadow: "3px 3px 0 #ffffff" }}
              >
                {data.name}
              </h1>
              <p className="text-sm font-bold text-gray-concrete">
                {data.members.length} חברים בחבורה
              </p>
            </header>

            {/* Daily activity strip */}
            <section className="bg-white border-[3px] border-ink shadow-[-4px_4px_0_0_#0A0A0A] rounded-xl p-4 md:p-5">
              <h2 className="font-black text-base text-center mb-3 uppercase tracking-wider text-gray-concrete">
                מה קורה היום בחבורה
              </h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="flex flex-col">
                  <span className="font-black text-3xl text-[#106B01] tabular-nums">
                    {data.activity.survivedToday}
                  </span>
                  <span className="text-xs font-bold text-gray-concrete">שרדו 🟢</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-3xl text-[#DC2626] tabular-nums">
                    {data.activity.diedToday}
                  </span>
                  <span className="text-xs font-bold text-gray-concrete">נפלו 🔴</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-3xl text-ink/60 tabular-nums">
                    {data.activity.pendingToday}
                  </span>
                  <span className="text-xs font-bold text-gray-concrete">עוד לא שיחקו</span>
                </div>
              </div>
            </section>

            {/* Join / Share row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!data.isMember && session && (
                <BrutalButton
                  variant="survive"
                  onClick={handleJoin}
                  disabled={busy}
                  className="flex-1"
                >
                  {busy ? "מצטרף…" : "הצטרף לחבורה 👥"}
                </BrutalButton>
              )}
              <BrutalButton variant="ink" onClick={handleShare} className="flex-1">
                {shareStatus ?? "הזמן עוד חברים 📤"}
              </BrutalButton>
            </div>

            {/* Member roster (ranked by total_score) */}
            <section>
              <h2 className="font-black text-xl mb-3">דירוג החבורה</h2>
              {data.members.length === 0 ? (
                <p className="text-center font-bold text-gray-concrete bg-white border-2 border-ink rounded-xl p-6">
                  אין פה אף חבר. או שהחברים שלך מפחדים מסיכונים, או שאין לך חברים. שתי האופציות עצובות.
                </p>
              ) : (
                <ol className="flex flex-col gap-2 list-none p-0">
                  {[...data.members]
                    .sort((a, b) => b.total_score - a.total_score || b.highest_streak - a.highest_streak)
                    .map((m, i) => {
                      const isMe = session?.user?.id === m.user_id;
                      return (
                        <li
                          key={m.user_id}
                          dir="rtl"
                          className={[
                            "flex items-center gap-3 bg-white border-2 border-ink rounded-xl shadow-[3px_3px_0_0_#0A0A0A] px-4 py-3",
                            isMe ? "outline outline-2 outline-[#22C55E] outline-offset-2" : "",
                          ].join(" ")}
                        >
                          <span className="font-black text-2xl text-gray-concrete w-8 text-center tabular-nums">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-black truncate">
                              {m.display}
                              {isMe && <span className="text-xs text-[#106B01] mr-2">(אתה)</span>}
                              {m.role === "creator" && (
                                <span className="text-xs bg-ink text-white px-1.5 py-0.5 mr-2">בעלים</span>
                              )}
                            </div>
                            <span className="inline-block mt-1 text-xs font-bold bg-[#F9FAFB] border border-ink px-2 py-0.5 rounded-full">
                              {m.madness_tag}
                            </span>
                          </div>
                          <div className="text-left shrink-0">
                            <div className="font-black tabular-nums">{m.total_score.toLocaleString("he-IL")}</div>
                            <div className="text-[10px] font-bold text-gray-concrete">🔥 שיא: {m.highest_streak}</div>
                          </div>
                        </li>
                      );
                    })}
                </ol>
              )}
            </section>

            {/* Anonymous users blocker for join */}
            {!data.isMember && !session && (
              <p className="text-center font-bold text-gray-concrete py-6">
                כדי להצטרף לחבורה, חזור למשחק והתחבר קודם.
              </p>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
