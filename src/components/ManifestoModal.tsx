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
        "p-3 border-[3px] shadow-[-4px_4px_0_0_#0A0A0A]",
        accent.bg, accent.border,
      ].join(" ")}
    >
      <h3 className="font-black text-sm md:text-base mb-1 leading-tight">{title}</h3>
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

function InfoCard({ heading, body }: { heading?: string; body: string }) {
  return (
    <div
      dir="rtl"
      className="p-3 md:p-4 bg-white border-[3px] border-ink shadow-[-4px_4px_0_0_#0A0A0A]"
    >
      {heading && (
        <h3 className="font-black text-sm md:text-base mb-1.5 leading-tight">{heading}</h3>
      )}
      <p className="text-xs md:text-sm leading-snug font-medium text-ink">{body}</p>
    </div>
  );
}

export function ManifestoModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[60] bg-ink/40 flex items-center justify-center p-3 md:p-4 font-rubik animate-[fadein_180ms_ease-out]"
    >
      <div
        style={{ backgroundColor: "#F6FBEE" }}
        className="relative w-full max-w-[680px] max-h-[92vh] border-[3px] border-ink shadow-[-6px_6px_0_0_#0A0A0A] overflow-y-auto"
      >
        {/* Closing X */}
        <button
          onClick={onClose}
          aria-label="סגור"
          className="absolute top-2 left-2 z-10 w-9 h-9 bg-white border-2 border-ink shadow-[-3px_3px_0_0_#0A0A0A] flex items-center justify-center font-black text-2xl leading-none active:translate-x-[-3px] active:translate-y-[3px] active:shadow-none transition-transform"
        >
          ×
        </button>

        <div className="px-4 md:px-5 pt-5 pb-4 flex flex-col gap-3">
          {/* Header */}
          <header className="text-center">
            <h1
              className="font-black tracking-tight text-ink leading-none whitespace-nowrap text-2xl md:text-3xl"
              style={{ textShadow: "2px 2px 0 #ffffff" }}
            >
              איך שורדים את היום? 💀
            </h1>
            <p className="mt-1.5 text-sm font-bold text-gray-concrete">
              המטרה: לעבור עוד יום של מציאות ישראלית בלי למות.
            </p>
          </header>

          {/* Core concept */}
          <InfoCard body="בכל בוקר מחדש, המציאות כאן מנסה לשבור אותך. המשימה שלך פשוטה: להיכנס פעם ביום, לבחור את המשחק שדרכו בא לך להתגרות בגורל היום (גלגל, קלפים, כוסות או חוטים) – ולנסות לשרוד. שרדת? תקבל משפט משעשע שמסביר איך שרדת את היום (הפעם). לא שרדת? הרצף (Streak) שלך יתאפס ותוכל לנסות שוב מחר ב-08:00. נתראה מחר." />

          {/* Scoring & risk */}
          <InfoCard
            heading="איך עובד הניקוד?"
            body="מאחורי כל בחירה מסתתר ערך ניקוד שונה. ככל ששעות היממה עוברות והסיכון עולה, ערכי הניקוד הנמוכים ביותר מתקלפים ונעלמים מן המשחקים. הניקוד עולה יחד עם הסיכון. המטרה היא לשרוד, ליצור רצף ימים ארוך, אבל גם לצבור כמה שיותר נקודות בעזרת מזל או סיכון מחושב."
          />

          {/* Player spectrum */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StrategyCard
                variant="survive"
                title="🟢 השפויים (שחקני הבוקר)"
                body="מייצגים את קצה הבטיחות. הם משחקים מוקדם כשהסיכון למות אפסי (5%). הרצף שלהם בטוח, אבל יש להם סיכוי גבוה ליפול על ניקוד נמוך."
              />
              <StrategyCard
                variant="error"
                title="🔴 המשוגעים (מהמרי הלילה)"
                body="מייצגים את קצה הטירוף. הם מחכים ל-23:30 כשהמשחק מתכווץ ל-50/50 מול המוות. סיכון ענק למחוק את הסטריק, אבל הניקוד מובטח להיות מקסימלי."
              />
            </div>
            <p className="text-xs md:text-sm font-bold text-gray-concrete text-center mt-2">
              רוב השחקנים יתמרנו איפשהו באמצע הטווח ויחשבו בדיוק מתי לפעול כדי לאזן בין הישרדות לחמדנות.
            </p>
          </section>

          {/* Social */}
          <ul className="flex flex-col gap-2 list-none p-0">
            <SocialPoint
              emoji="👥"
              label="משחק קבוצתי"
              body="הרבה יותר כיף למות ביחד. פתחו קבוצה סגורה רק לחברים שלכם ותראו למי יש את העצבים הכי חזקים."
            />
            <SocialPoint
              emoji="🛟"
              label="הצלת הסטריק"
              body="מתתם? אל תבכו. תביאו חבר חדש למשחק דרך הלינק שלכם, ונבצע לכם החייאה ונציל לכם את הרצף."
            />
            <SocialPoint
              emoji="✍️"
              label="שיפור המשחק"
              body="חושבים שאתם יותר מצחיקים מאיתנו? הציעו סיבות חדשות למה שרדתם או למה מתתם דרך כפתור ההצעות בעמוד הפרופיל שלכם."
            />
          </ul>

          {/* Trigger line */}
          <p className="text-sm md:text-base font-black text-ink text-center">
            מי ישמור על הרצף הכי ארוך? מי יצבור הכי הרבה נקודות? ומי יהיה הכי משוגע וייקח יותר סיכונים?
          </p>

          {/* CTA */}
          <div className="flex justify-center pt-0.5">
            <BrutalButton
              variant="survive"
              onClick={onClose}
              className="text-base md:text-lg py-3 px-6"
            >
              הבנתי, אני רוצה לשחק 🎲
            </BrutalButton>
          </div>
        </div>
      </div>
    </div>
  );
}
