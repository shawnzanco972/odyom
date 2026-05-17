"use client";
import { BrutalButton } from "./BrutalButton";

interface Props {
  open: boolean;
  onClose: () => void;
}

function StrategyCard({
  variant, title, body,
}: {
  variant: "survive" | "error";
  title: string;
  body: string;
}) {
  const accent =
    variant === "survive"
      ? { bg: "bg-[#C4EAB4]", border: "border-[#106B01]" }
      : { bg: "bg-[#FECACA]", border: "border-[#DC2626]" };
  return (
    <div
      dir="rtl"
      className={[
        "p-3 md:p-4 border-[3px] shadow-[-4px_4px_0_0_#0A0A0A]",
        accent.bg, accent.border,
      ].join(" ")}
    >
      <h3 className="font-black text-base md:text-lg mb-1.5 leading-tight">{title}</h3>
      <p className="text-xs md:text-sm leading-snug font-medium text-ink">{body}</p>
    </div>
  );
}

function SocialPoint({
  emoji, label, body,
}: {
  emoji: string;
  label: string;
  body: string;
}) {
  return (
    <li
      dir="rtl"
      className="flex gap-3 items-start bg-white border-2 border-ink p-2.5 shadow-[-3px_3px_0_0_#0A0A0A]"
    >
      <span className="text-xl shrink-0 leading-none mt-0.5" aria-hidden>{emoji}</span>
      <p className="text-xs md:text-sm leading-snug font-medium text-ink">
        <span className="font-black">{label}:</span> {body}
      </p>
    </li>
  );
}

export function ManifestoModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[60] bg-ink/40 flex items-center justify-center p-3 md:p-6 font-rubik animate-[fadein_180ms_ease-out]"
    >
      <div
        style={{ backgroundColor: "#F6FBEE" }}
        className="relative w-full max-w-[650px] max-h-[95vh] md:max-h-[90vh] border-[3px] border-ink shadow-[-6px_6px_0_0_#0A0A0A] overflow-y-auto"
      >
        {/* Closing X */}
        <button
          onClick={onClose}
          aria-label="סגור"
          className="absolute top-2 left-2 z-10 w-9 h-9 bg-white border-2 border-ink shadow-[-3px_3px_0_0_#0A0A0A] flex items-center justify-center font-black text-2xl leading-none active:translate-x-[-3px] active:translate-y-[3px] active:shadow-none transition-transform"
        >
          ×
        </button>

        <div className="px-4 md:px-6 pt-6 pb-5 md:pt-7 md:pb-6 flex flex-col gap-4 md:gap-5">
          {/* Header */}
          <header className="text-center">
            <h1
              className="font-black uppercase tracking-tighter text-ink leading-none whitespace-nowrap"
              style={{
                fontSize: "clamp(1.5rem, 6vw, 2.5rem)",
                textShadow: "3px 3px 0 #ffffff",
              }}
            >
              איך שורדים את היום? 💀
            </h1>
            <p className="mt-2 text-sm md:text-base font-bold text-gray-concrete">
              המטרה פשוטה: לעבור עוד 24 שעות של מציאות ישראלית בלי למות.
            </p>
          </header>

          {/* Strategy split */}
          <section>
            <h2 className="font-black text-base md:text-lg mb-2 text-center">
              יש שתי דרכים לשחק.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StrategyCard
                variant="survive"
                title="השפויים (שחקני הבוקר) 🟢"
                body="רואי חשבון ואנשים שמסדרים את הארון לפי צבעים. משחקים בבוקר כשהסיכון נמוך (5%). הסטריק בטוח — אבל הניקוד? פח אשפה."
              />
              <StrategyCard
                variant="error"
                title="המשוגעים (מהמרי הלילה) 🔴"
                body="הפסיכופתים שכובשים את הלידרבורד. מחכים ל־23:30 כשהגלגל מתכווץ ל־50/50. סיכון ענק למחוק הכל — אבל המנצחים גורפים ניקוד פסיכי."
              />
            </div>
          </section>

          {/* Social framework */}
          <section>
            <h2 className="font-black text-base md:text-lg mb-2 text-center">
              המשחק גדול ממך לבד.
            </h2>
            <ul className="flex flex-col gap-2 list-none p-0">
              <SocialPoint
                emoji="👥"
                label="משחק קבוצתי"
                body="פתחו קבוצה סגורה רק לחברים שלכם ותראו למי יש את העצבים הכי חזקים."
              />
              <SocialPoint
                emoji="🛟"
                label="הצלת הסטריק"
                body="מתתם? אל תבכו. הביאו חבר חדש דרך הלינק שלכם, ונחזיר אתכם לחיים ונציל לכם את הרצף."
              />
              <SocialPoint
                emoji="✍️"
                label="שיפור המשחק"
                body="חושבים שאתם יותר מצחיקים מאיתנו? הציעו סיבות חדשות למה שרדתם או למה מתתם דרך כפתור ההצעות שבעמוד הטבלה (Leaderboard)."
              />
            </ul>
          </section>

          {/* CTA */}
          <div className="flex justify-center pt-1">
            <BrutalButton
              variant="survive"
              onClick={onClose}
              className="text-base md:text-lg py-3 px-6"
            >
              הבנתי, כנס אותי למשחק 🎲
            </BrutalButton>
          </div>
        </div>
      </div>
    </div>
  );
}
