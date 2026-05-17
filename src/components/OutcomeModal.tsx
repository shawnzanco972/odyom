"use client";
import { LinkGoogleButton } from "./LinkGoogleButton";
import { ShareButton } from "./ShareButton";
import { riskTierFromBalls } from "@/lib/risk";
import { gameModeGlyph, gameModeLabel, outcomeMessage } from "@/lib/game-modes";
import type { GameMode } from "./GameModeTabs";

export interface OutcomeModalProps {
  outcome: "survive" | "death";
  reasonText: string;
  unlockAt?: Date;
  judgementAt: Date;
  hour: number;
  streak: number;
  score: number;
  /** Number of slots/items the user played against (drives the risk tier
   *  display so it matches the in-game gauge exactly). */
  ballsDropped: number;
  /** Which mini-game the user picked, so the result line reads
   *  "המשחק: גלגל הגורלות / קלפים / כוסות / חוטים". */
  gameMode: GameMode;
  /** UUID of the current user — embedded in share URLs to seed the rescue loop. */
  userId: string | null;
  onProfile: () => void;
  onLeaderboard: () => void;
  onClose: () => void;
}

function formatIST(d: Date): string {
  return d.toLocaleTimeString("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function OutcomeModal({
  outcome,
  reasonText,
  unlockAt,
  judgementAt,
  hour: _hour,
  streak,
  score,
  ballsDropped,
  gameMode,
  userId,
  onProfile,
  onLeaderboard,
  onClose,
}: OutcomeModalProps) {
  const isSurvive = outcome === "survive";
  const bgColor = isSurvive ? "#C4EAB4" : "#FECACA";
  const accentBg = isSurvive ? "bg-[#106B01]" : "bg-[#DC2626]";
  // Single source of truth — same tier used by the in-game gauge.
  const risk = riskTierFromBalls(ballsDropped);
  // Underscore-prefixed `hour` arg retained for backwards-compat with callers
  // that still pass it; this component no longer uses it directly.
  void _hour;

  return (
    <div
      dir="rtl"
      style={{ backgroundColor: bgColor }}
      className="fixed inset-0 z-50 overflow-y-auto animate-[fadein_220ms_ease-out]"
    >
      {/* Faint background decoration */}
      <div aria-hidden className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
        <span className="text-[200px] sm:text-[280px] font-black select-none">
          {isSurvive ? "🎉" : "💀"}
        </span>
      </div>

      {/* Tight container so the whole card fits in a phone screenshot */}
      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-6 sm:py-8 min-h-screen flex flex-col items-center justify-center font-rubik">

        {/* Header — slightly smaller than before, single-line on most viewports */}
        <div className="text-center mb-4 transform -rotate-3">
          <h1
            className="font-black text-ink uppercase tracking-tighter leading-[0.95] whitespace-nowrap"
            style={{
              fontSize: "clamp(2.5rem, 11vw, 4rem)",
              textShadow: "4px 4px 0 #ffffff",
            }}
          >
            {isSurvive ? "שרדת! 🟢" : "מתת 🔴"}
          </h1>
        </div>

        {/* Risk badge — no fraction; tier matches the in-game gauge */}
        <div className="mb-2 transform -rotate-1">
          <span
            className="inline-block text-white font-black text-sm sm:text-base px-3.5 py-2 border-[3px] border-ink shadow-[3px_3px_0_0_#0A0A0A] uppercase tracking-wide"
            style={{ backgroundColor: risk.color }}
          >
            רמת סיכון: {risk.label}
          </span>
        </div>

        {/* Chosen-game line — compact so the card still fits one screen */}
        <p className="mb-3 text-xs sm:text-sm font-black text-ink/80 uppercase tracking-wider">
          {gameModeGlyph(gameMode)} משחק: {gameModeLabel(gameMode)}
        </p>

        {/* Per-game narrative — the cinematic 'what just happened'. Sits above
            the cynical 'why' reason text from CONTENT.json. */}
        <p className="mb-4 max-w-md text-center text-base sm:text-lg font-bold leading-snug text-ink/90 px-2">
          {outcomeMessage(gameMode, outcome)}
        </p>

        {/* Reason — death shows it big above the card; survive folds it inside */}
        {!isSurvive && (
          <p className="text-center text-lg sm:text-xl font-extrabold leading-tight text-ink max-w-md mb-4 px-2">
            {reasonText}
          </p>
        )}

        {/* Stats card — tilted, tighter padding */}
        <div className="w-full max-w-sm bg-white border-[3px] border-ink shadow-[6px_6px_0_0_#0A0A0A] rounded-lg p-4 transform rotate-2 mb-5">
          {isSurvive ? (
            <>
              <div className="flex items-center justify-center mb-1.5 text-[#106B01] text-3xl">📈</div>
              <p className="font-black text-base sm:text-lg text-ink text-center leading-snug">{reasonText}</p>
              <div className="border-t-2 border-ink my-2.5" />
              <div className="flex justify-around items-baseline">
                <div className="text-center">
                  <div className="font-black text-2xl">🔥 {streak}</div>
                  <div className="text-[10px] font-bold text-gray-concrete uppercase">רצף</div>
                </div>
                <div className="text-center">
                  <div className="font-black text-2xl">{score.toLocaleString("he-IL")}</div>
                  <div className="text-[10px] font-bold text-gray-concrete uppercase">ניקוד</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center mb-1.5 text-[#DC2626] text-3xl">📉</div>
              <p className="font-black text-lg text-ink text-center">הרצף התאפס ל־0</p>
              <p className="font-bold text-sm text-center text-gray-concrete mt-1">
                ניקוד סופי: {score.toLocaleString("he-IL")}
              </p>
            </>
          )}
        </div>

        {/* Timestamp + share-friendly meta pill */}
        <div className="mb-4 transform rotate-1">
          <span className="inline-block bg-white border-2 border-ink px-3 py-1 shadow-[3px_3px_0_0_#0A0A0A] font-bold text-xs whitespace-nowrap">
            🕒 שעת גזירת הדין: {formatIST(judgementAt)}
          </span>
        </div>

        {/* PRIMARY CTA: profile is the natural next-step — see your full
            stats + history + share-rescue tools all in one place. */}
        <button
          onClick={onProfile}
          className={`w-full max-w-sm ${accentBg} text-white border-[3px] border-ink rounded-lg py-3.5 px-5 font-black text-lg shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-[-6px] active:translate-y-[6px] active:shadow-none transition-transform duration-75 flex items-center justify-center gap-2 mb-3`}
        >
          👤 לאזור האישי שלי
        </button>

        {/* SECONDARY ROW: share + leaderboard, smaller pills */}
        <div className="w-full max-w-sm flex gap-2 mb-4">
          <ShareButton
            outcome={outcome}
            streak={streak}
            reason={reasonText}
            referrerId={userId}
            compact
            className="flex-1"
          />
          <button
            onClick={onLeaderboard}
            className="flex-1 bg-white text-ink border-[3px] border-ink rounded-lg py-2.5 px-4 font-black text-base shadow-[3px_3px_0_0_#0A0A0A] active:translate-x-[-3px] active:translate-y-[3px] active:shadow-none transition-transform duration-75 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            🏆 טבלה
          </button>
        </div>

        {/* Google linkage banner — anon users only (component self-gates) */}
        <div className="w-full max-w-sm mb-3">
          <LinkGoogleButton />
        </div>

        {/* Death lockout countdown */}
        {!isSurvive && unlockAt && (
          <p className="text-xs font-bold text-ink/70 mb-2">
            נפתח שוב ב־
            {unlockAt.toLocaleString("he-IL", {
              timeZone: "Asia/Jerusalem",
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
            })}
          </p>
        )}

        {/* Tertiary: small back-to-main link */}
        <button
          onClick={onClose}
          className="font-bold text-xs text-ink/60 underline hover:text-[#106B01] transition-colors mt-2"
        >
          חזור למסך הראשי
        </button>
      </main>
    </div>
  );
}
