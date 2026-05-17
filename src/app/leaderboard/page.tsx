import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { normalizeUserRow } from "@/lib/supabase/types";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { LeaderboardTabs } from "@/components/LeaderboardTabs";
import { NicknameEditor } from "@/components/NicknameEditor";
import { SuggestionTrigger } from "@/components/SuggestionTrigger";
import { LinkGoogleButton } from "@/components/LinkGoogleButton";
import { BottomNav } from "@/components/BottomNav";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await getServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("users")
    .select("id, username, nickname, total_score, current_streak, highest_streak, madness_tag, last_outcome, last_played_date, last_reason, seen_reasons")
    .order("total_score", { ascending: false })
    .order("highest_streak", { ascending: false })
    .limit(50);

  const players = (rows ?? []).map(normalizeUserRow);

  return (
    <main
      dir="rtl"
      style={{ backgroundColor: "#F1FDE7" }}
      className="min-h-screen pb-28"
    >
      {/* Sticky top bar */}
      <header className="sticky top-0 z-30 bg-white border-b-4 border-ink shadow-[0_4px_0_0_#0A0A0A] flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
        <Link href="/" className="font-bold text-sm underline hover:text-[#106B01]">
          ← למשחק
        </Link>
        <h1 className="font-black text-xl tracking-tight">לשרוד את היום</h1>
        <span className="text-2xl" aria-hidden>⚡</span>
      </header>

      <div className="w-full max-w-2xl mx-auto px-4 pt-6 flex flex-col gap-5 font-rubik">
        {/* Page hero */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <h2
            className="font-black text-4xl sm:text-5xl uppercase tracking-tighter text-center"
            style={{ textShadow: "3px 3px 0 #0A0A0A" }}
          >
            לוח הגורלות
          </h2>
          <p className="text-sm font-bold text-gray-concrete">
            מי פה הפראייר התורן?
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white border-2 border-ink rounded-xl p-2 shadow-[4px_4px_0_0_#0A0A0A]">
          <LeaderboardTabs />
        </div>

        {/* Account controls */}
        {user && (
          <div className="flex flex-col gap-2">
            <NicknameEditor />
            <div className="flex gap-2 items-center justify-end">
              <LinkGoogleButton compact />
              <SuggestionTrigger />
            </div>
          </div>
        )}

        {/* List */}
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
              עדיין אין שחקנים. תהיה הראשון לשרוד!
            </li>
          )}
        </ol>
      </div>

      <BottomNav />
    </main>
  );
}
