"use client";
import { BrutalButton } from "./BrutalButton";

export interface OutcomeModalProps {
  outcome: "survive" | "death";
  reasonText: string;
  unlockAt?: Date;
  /** When the user pressed "drop" (IST display). */
  judgementAt: Date;
  /** IST hour at judgement time — drives the risk tier badge. */
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1 bg-white border-2 border-ink px-3 py-1.5 shadow-[-3px_3px_0_0_#0A0A0A] font-rubik font-bold text-sm whitespace-nowrap">
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border-[3px] border-ink shadow-[-4px_4px_0_0_#0A0A0A] px-4 py-3 text-center">
      <div className="font-rubik font-bold text-xs text-gray-concrete uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="font-rubik font-black text-2xl text-ink leading-none">{value}</div>
    </div>
  );
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
  const borderColor = isSurvive ? "border-survive" : "border-death";
  const accentColor = isSurvive ? "text-survive" : "text-death";
  const topLabel = isSurvive ? "תוצאה: שרדת!" : "תוצאה: מתת";
  const header = isSurvive ? "שרדת! 🟢" : "מתת 🔴";
  const risk = riskForHour(hour);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 overflow-y-auto">
      <div
        dir="rtl"
        className={`relative w-full max-w-lg bg-white border-[4px] ${borderColor} shadow-[-8px_8px_0_0_#0A0A0A] p-6 sm:p-8 font-rubik`}
      >
        {/* 1. Top label */}
        <div className={`font-bold text-sm uppercase tracking-widest mb-2 ${accentColor}`}>
          {topLabel}
        </div>

        {/* 2. Oversized header with stark black text-shadow */}
        <h2
          className="font-black leading-[0.95] tracking-tight text-ink mb-6"
          style={{
            fontSize: "clamp(3rem, 10vw, 4.75rem)",
            textShadow: "4px 4px 0 #0A0A0A",
            WebkitTextStroke: "1px #0A0A0A",
          }}
        >
          <span className={accentColor}>{header}</span>
        </h2>

        {/* 3. Main cynical phrase box */}
        <div className="bg-white border-[3px] border-ink shadow-[-4px_4px_0_0_#0A0A0A] p-4 mb-5">
          <p className="text-lg font-medium text-ink leading-snug">{reasonText}</p>
        </div>

        {/* 4. NEW — Timestamp & Risk metadata row */}
        <div className="flex flex-wrap gap-2 mb-5 justify-start">
          <Pill>🕒 שעת גזירת הדין: {formatIST(judgementAt)}</Pill>
          <Pill>🎲 רמת סיכון: {risk.label} ({risk.fraction})</Pill>
        </div>

        {/* 5. Score / streak stat grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            label="רצף"
            value={isSurvive ? `🔥 ${streak}` : "💀 0"}
          />
          <StatCard label="ניקוד" value={`🏆 ${score.toLocaleString("he-IL")}`} />
        </div>

        {/* Death lockout countdown */}
        {!isSurvive && unlockAt && (
          <div className="text-sm text-gray-concrete font-bold mb-5">
            המשחק הבא נפתח ב־
            {unlockAt.toLocaleString("he-IL", {
              timeZone: "Asia/Jerusalem",
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
            })}
          </div>
        )}

        {/* 6. Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <BrutalButton variant="ink" onClick={onSecondary} className="text-base">
            חזור למסך הראשי
          </BrutalButton>
          <BrutalButton
            variant={isSurvive ? "survive" : "death"}
            onClick={onPrimary}
            className="text-base"
          >
            השווי להמונים
          </BrutalButton>
        </div>
      </div>
    </div>
  );
}
