"use client";
import { BrutalButton } from "./BrutalButton";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface StrategyCardProps {
  variant: "survive" | "error";
  title: string;
  body: string;
}

function StrategyCard({ variant, title, body }: StrategyCardProps) {
  const accent =
    variant === "survive"
      ? { bg: "bg-[#C4EAB4]", border: "border-[#106B01]" }
      : { bg: "bg-[#FECACA]", border: "border-[#DC2626]" };
  return (
    <div
      dir="rtl"
      className={[
        "p-6 border-[3px] shadow-[-4px_4px_0_0_#0A0A0A]",
        accent.bg,
        accent.border,
      ].join(" ")}
    >
      <h3 className="font-black text-2xl mb-3 leading-tight">{title}</h3>
      <p className="text-base leading-relaxed font-medium text-ink">{body}</p>
    </div>
  );
}

interface SocialPointProps {
  emoji: string;
  label: string;
  body: string;
}

function SocialPoint({ emoji, label, body }: SocialPointProps) {
  return (
    <li
      dir="rtl"
      className="flex gap-4 items-start bg-white border-[3px] border-ink p-4 shadow-[-4px_4px_0_0_#0A0A0A]"
    >
      <span className="text-3xl shrink-0 leading-none" aria-hidden>{emoji}</span>
      <p className="text-base leading-relaxed font-medium text-ink">
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
      style={{ backgroundColor: "#F6FBEE" }}
      className="fixed inset-0 z-[60] overflow-y-auto font-rubik animate-[fadein_220ms_ease-out]"
    >
      {/* Closing X — fixed top-LEFT (visual end in RTL) */}
      <button
        onClick={onClose}
        aria-label="סגור"
        className="fixed top-4 left-4 z-10 w-12 h-12 bg-white border-[3px] border-ink shadow-[-4px_4px_0_0_#0A0A0A] flex items-center justify-center font-black text-3xl leading-none active:translate-x-[-4px] active:translate-y-[4px] active:shadow-none transition-transform"
      >
        ×
      </button>

      <main className="w-full max-w-4xl mx-auto px-5 md:px-8 py-12 md:py-16 flex flex-col gap-10">
        {/* Header */}
        <header className="text-center">
          <h1
            className="font-black uppercase tracking-tighter text-ink leading-none"
            style={{
              fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
              textShadow: "4px 4px 0 #ffffff",
            }}
          >
            איך שורדים את היום? 💀
          </h1>
          <p className="mt-5 text-lg md:text-xl font-bold text-gray-concrete max-w-2xl mx-auto">
            המטרה פשוטה: לעבור עוד 24 שעות של מציאות ישראלית בלי למות.
          </p>
        </header>

        {/* Strategy split — desktop 2-col, mobile stacked */}
        <section>
          <h2 className="font-black text-2xl md:text-3xl mb-5 text-center">
            יש שתי דרכים לשחק.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <StrategyCard
              variant="survive"
              title="🟢 השפויים (שחקי הבוקר)"
              body="רואי חשבון ואנשים שמסדרים את הארון לפי צבעים. הם משחקים בבוקר כשהסיכון למות נמוך (5%). הסטריק שלהם בטוח, אבל הניקוד שהם מקבלים? פח אשפה."
            />
            <StrategyCard
              variant="error"
              title="🔴 המשוגעים (מהמרי הלילה)"
              body="הפסיכופתים שרוצים לכבוש את הלידרבורד. הם מחכים ל־23:30 כשהגלגל מתכווץ ל־50/50 אכזרי. סיכון ענק למחוק את כל הסטריק, אבל המנצחים גורפים ניקוד פסיכי."
            />
          </div>
        </section>

        {/* Social framework */}
        <section>
          <h2 className="font-black text-2xl md:text-3xl mb-5 text-center">
            המשחק גדול ממך לבד.
          </h2>
          <ul className="flex flex-col gap-3 list-none p-0">
            <SocialPoint
              emoji="👥"
              label="משחק קבוצתי"
              body="פתחו קבוצה סגורה רק לחברים שלכם ותראו למי יש את העצבים הכי חזקים."
            />
            <SocialPoint
              emoji="🛟"
              label="הצלת הסטריק"
              body="מתתם? אל תבכו. תביאו חבר חדש למשחק דרך הלינק שלכם, ונחזיר אתכם לחיים ונציל לכם את הרצף."
            />
            <SocialPoint
              emoji="✍️"
              label="שיפור המשחק"
              body="חושבים שאתם יותר מצחיקים מאיתנו? הציעו סיבות חדשות למה שרדתם או למה מתתם, ואם הן טובות — נכניס אותן לגלגל."
            />
          </ul>
        </section>

        {/* Footer CTA */}
        <div className="flex justify-center pt-2 pb-8">
          <BrutalButton
            variant="survive"
            onClick={onClose}
            className="text-lg md:text-xl py-4 px-8"
          >
            הבנתי, כנס אותי למשחק 🎲
          </BrutalButton>
        </div>
      </main>
    </div>
  );
}
