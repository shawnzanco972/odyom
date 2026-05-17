"use client";
import { BrutalButton } from "./BrutalButton";
import { LinkGoogleButton } from "./LinkGoogleButton";

export interface OutcomeModalProps {
  outcome: "survive" | "death";
  reasonText: string;
  unlockAt?: Date;
  judgementAt: Date;
  hour: number;
  streak: number;
  score: number;
  onPrimary: () => void;
  onSecondary: () => void;
}

type RiskTier = { label: string; fraction: string };
function riskForHour(h: number): RiskTier {
  if (h < 11) return { label: "קלילה", fraction: "1/32" };
  if (h < 15) return { label: "בינונית", fraction: "1/20" };
  if (h < 19) return { label: "גבוהה", fraction: "1/12" };
  return { label: "פסיכופת", fraction: "1/2" };
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
  hour,
  streak,
  score,
  onPrimary,
  onSecondary,
}: OutcomeModalProps) {
  const isSurvive = outcome === "survive";
  // Inline color avoids any Tailwind JIT/cache miss on custom tokens.
  const bgColor = isSurvive ? "#C4EAB4" : "#FECACA";
  const accentBg = isSurvive ? "bg-[#106B01]" : "bg-[#DC2626]";
  const ctaText = isSurvive ? "השווי להמונים" : "הבנתי, שחרר אותי";
  const risk = riskForHour(hour);

  return (
    <div
      dir="rtl"
      style={{ backgroundColor: bgColor }}
      className="fixed inset-0 z-50 overflow-y-auto animate-[fadein_220ms_ease-out]"
    >
      {/* Faint background decoration */}
      <div aria-hidden className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
        <span className="text-[260px] sm:text-[360px] font-black select-none">
          {isSurvive ? "🎉" : "💀"}
        </span>
      </div>

      <main className="relative z-10 w-full max-w-xl mx-auto px-5 py-10 min-h-screen flex flex-col items-center justify-center font-rubik">

        {/* Oversized rotated header with white text-shadow */}
        <div className="text-center mb-8 transform -rotate-3">
          <h1
            className="font-black text-ink uppercase tracking-tighter leading-[0.95]"
            style={{
              fontSize: "clamp(3.5rem, 14vw, 5.5rem)",
              textShadow: "4px 4px 0 #ffffff",
            }}
          >
            {isSurvive ? "שרדת! 🟢" : "מתת 🔴"}
          </h1>
        </div>

        {/* Risk-level badge — vivid pill, slight rotation */}
        <div className="mb-7 transform -rotate-1">
          <span
            className={`inline-block ${accentBg} text-white font-black text-lg sm:text-xl px-5 py-3 border-[3px] border-ink shadow-[4px_4px_0_0_#0A0A0A] uppercase tracking-wide`}
          >
            רמת סיכון: {risk.label} ({risk.fraction})
          </span>
        </div>

        {/* Reason text on death (per design — death shows it big, no card); for
            survive we'll put it inside the stats card for parity with the spec */}
        {!isSurvive && (
          <p className="text-center text-2xl sm:text-3xl font-extrabold leading-tight text-ink max-w-md mb-8 px-2">
            {reasonText}
          </p>
        )}

        {/* Stats card — tilted, 3px border, thick offset shadow */}
        <div className="w-full max-w-sm bg-white border-[3px] border-ink shadow-[8px_8px_0_0_#0A0A0A] rounded-lg p-6 transform rotate-2 mb-8">
          {isSurvive ? (
            <>
              <div className="flex items-center justify-center mb-3 text-[#106B01] text-5xl">📈</div>
              <p className="font-black text-2xl text-ink text-center">{reasonText}</p>
              <div className="border-t-2 border-ink my-4" />
              <p className="font-black text-xl text-center">ניקוד סופי: {score.toLocaleString("he-IL")}</p>
              <p className="font-bold text-lg text-center text-gray-concrete">רצף: {streak} ימים</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center mb-3 text-death text-5xl">📉</div>
              <p className="font-black text-2xl text-ink text-center">הרצף התאפס ל־0</p>
              <p className="font-bold text-base text-center text-gray-concrete mt-1">
                ניקוד סופי: {score.toLocaleString("he-IL")}
              </p>
            </>
          )}
        </div>

        {/* Compact timestamp pill (kept from previous design for screenshot-shareability) */}
        <div className="mb-7 transform rotate-1">
          <span className="inline-block bg-white border-2 border-ink px-3 py-1.5 shadow-[3px_3px_0_0_#0A0A0A] font-bold text-sm whitespace-nowrap">
            🕒 שעת גזירת הדין: {formatIST(judgementAt)}
          </span>
        </div>

        {/* Primary CTA */}
        <button
          onClick={onPrimary}
          className={`w-full max-w-sm ${accentBg} text-white border-[3px] border-ink rounded-lg py-4 px-6 font-black text-xl shadow-[6px_6px_0_0_#0A0A0A] active:translate-x-[-6px] active:translate-y-[6px] active:shadow-none transition-transform duration-75 flex items-center justify-center gap-3 mb-3`}
        >
          {ctaText}
          <span aria-hidden>{isSurvive ? "↗" : "→"}</span>
        </button>

        {/* Google linkage banner — both outcomes (preserves streak across devices) */}
        <div className="w-full max-w-sm mb-4">
          <LinkGoogleButton />
        </div>

        {/* Death lockout countdown */}
        {!isSurvive && unlockAt && (
          <p className="text-sm font-bold text-ink/70 mb-3">
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

        {/* Secondary "back to main" underlined link */}
        <button
          onClick={onSecondary}
          className="font-bold text-base text-ink underline hover:text-[#106B01] transition-colors"
        >
          חזור למסך הראשי
        </button>
      </main>
    </div>
  );
}
