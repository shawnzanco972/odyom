import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { normalizeUserRow } from "@/lib/supabase/types";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { LeaderboardTabs } from "@/components/LeaderboardTabs";
import { BottomNav } from "@/components/BottomNav";
import { TopNav } from "@/components/TopNav";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("users")
    .select("id, username, nickname, total_score, current_streak, highest_streak, madness_tag, last_outcome, last_played_at, last_played_date, last_reason, seen_reasons, referrer_id, streak_before_last_death, rescue_pending, has_played_ever")
    .order("total_score", { ascending: false })
    .order("highest_streak", { ascending: false })
    .limit(50);

  const players = (rows ?? []).map(normalizeUserRow);

  return (
    <div
      dir="rtl"
      style={{ backgroundColor: "#F1FDE7" }}
      className="min-h-screen pb-28 md:pb-12"
    >
      <TopNav />

      {/* Mobile-only sticky top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-white border-b-4 border-ink shadow-[0_4px_0_0_#0A0A0A] flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
        <Link href="/" className="font-bold text-sm underline hover:text-[#106B01]">
          ← למשחק
        </Link>
        <h1 className="font-black text-xl tracking-tight">לשרוד את היום</h1>
        <span className="text-2xl" aria-hidden>⚡</span>
      </header>

      <main className="w-full max-w-3xl mx-auto px-4 md:px-6 pt-6 md:pt-10 font-rubik flex flex-col gap-5">
        {/* Hero */}
        <div className="flex flex-col items-center gap-2 mb-2 text-center">
          <h2
            className="font-black text-4xl md:text-6xl uppercase tracking-tighter text-ink leading-none"
            style={{ textShadow: "4px 4px 0 #ffffff" }}
          >
            טבלת השורדים של עם הנצח
          </h2>
          <p className="text-sm md:text-base font-bold text-gray-concrete max-w-md">
            מי שרד הכי הרבה ימים בלי להישבר?
          </p>
        </div>

        <div className="bg-white border-2 border-ink rounded-xl p-2 shadow-[4px_4px_0_0_#0A0A0A]">
          <LeaderboardTabs />
        </div>

        <ol className="flex flex-col gap-3 list-none p-0">
          {players.map((p, i) => (
            <li key={p.id}>
              <LeaderboardRow
                rank={i + 1}
                display={p.nickname?.trim() || p.username}
                totalScore={p.total_score}
                currentStreak={p.current_streak}
                highestStreak={p.highest_streak}
                madnessTag={p.madness_tag}
                isMe={user?.id === p.id}
              />
            </li>
          ))}
          {players.length === 0 && (
            <li className="text-center text-gray-concrete font-bold py-12">
              טבלת הדירוג ריקה. כולם מתו היום או שאף אחד עוד לא קם?
            </li>
          )}
        </ol>
      </main>

      <BottomNav />
    </div>
  );
}
