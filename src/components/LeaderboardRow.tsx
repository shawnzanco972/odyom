"use client";

interface Props {
  rank: number;
  display: string;
  totalScore: number;
  currentStreak: number;
  highestStreak: number;
  madnessTag: string;
  isMe?: boolean;
}

// Color the madness pill differently based on rank for visual interest.
function pillStyleForRank(rank: number): string {
  if (rank === 1) return "bg-[#BB0022] text-white border-ink";
  if (rank === 2) return "bg-[#106B01] text-white border-ink";
  if (rank === 3) return "bg-white text-ink border-ink";
  return "bg-[#F9FAFB] text-gray-concrete border-ink";
}

export function LeaderboardRow({
  rank, display, totalScore, currentStreak, highestStreak, madnessTag, isMe,
}: Props) {
  const isTop = rank <= 3;
  return (
    <div
      dir="rtl"
      className={[
        "relative overflow-hidden font-rubik flex items-center gap-3 px-4 py-4 rounded-xl",
        isTop
          ? "bg-[#FFDB40] border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A]"
          : "bg-white border-2 border-ink shadow-[4px_4px_0_0_#0A0A0A]",
        isMe ? "outline outline-2 outline-survive outline-offset-2" : "",
      ].join(" ")}
    >
      {/* Corner rank chip — top 3 only. Visual-RIGHT corner in RTL (matches
          the design reference and sits opposite the score column on the left). */}
      {isTop && (
        <div className="absolute top-0 right-0 w-10 h-10 bg-ink text-[#FFDB40] flex items-center justify-center rounded-bl-xl font-black text-lg z-10 leading-none">
          {rank}
        </div>
      )}
      {/* Regular rank number for 4+ */}
      {!isTop && (
        <div className="w-8 text-center font-black text-2xl text-gray-concrete">{rank}</div>
      )}

      {/* Trophy icon (top 3) */}
      {isTop && (
        <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-ink rounded-full flex items-center justify-center shadow-[2px_2px_0_0_#0A0A0A] text-2xl">
          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className={`font-black truncate ${isTop ? "text-xl" : "text-base"}`}>
          {display}
          {isMe && <span className="text-xs text-[#106B01] mr-2">(אתה)</span>}
        </div>
        <span
          className={[
            "inline-block mt-1 font-bold text-xs px-2 py-0.5 rounded-full border-2",
            isTop ? "shadow-[2px_2px_0_0_#0A0A0A]" : "",
            pillStyleForRank(rank),
          ].join(" ")}
        >
          {madnessTag}
        </span>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`font-black tracking-tight tabular-nums ${isTop ? "text-2xl" : "text-lg"}`}>
          {totalScore.toLocaleString("he-IL")}
        </span>
        <div className="flex items-center gap-1 bg-white px-2 py-0.5 border border-ink rounded-full text-xs">
          <span aria-hidden>🔥</span>
          <span className="font-bold">שיא: {highestStreak}</span>
        </div>
        {isTop && currentStreak > 0 && (
          <span className="text-[10px] font-bold text-gray-concrete">
            רצף נוכחי: {currentStreak}
          </span>
        )}
      </div>
    </div>
  );
}
