"use client";
import { useState } from "react";
import { useUser } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabase/browser";
import { BrutalButton } from "@/components/BrutalButton";

type Slot = "morning" | "noon" | "afternoon" | "night";

const SLOT_BUTTONS: { slot: Slot; label: string }[] = [
  { slot: "morning",   label: "בוקר" },
  { slot: "noon",      label: "צהריים" },
  { slot: "afternoon", label: "אחה״צ" },
  { slot: "night",     label: "לילה" },
];

export function SuggestionDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { userRow } = useUser();
  const supabase = getBrowserClient();

  const [text, setText] = useState("");
  const [type, setType] = useState<"survive" | "death" | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setText(""); setType(null); setSlot(null);
    setSubmitting(false); setSuccess(false); setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    const trimmed = text.trim();
    if (trimmed.length < 10 || trimmed.length > 280) {
      setError("המשפט חייב להיות בין 10 ל-280 תווים");
      return;
    }
    if (!type) {
      setError("בחר אם זה משפט שרדת או מוות");
      return;
    }
    if (!slot) {
      setError("בחר באיזו שעה ביום המשפט הכי מתאים");
      return;
    }
    if (!userRow || !supabase) {
      setError("נדרשת התחברות");
      return;
    }
    setSubmitting(true);
    // 1-to-1 mapping: the chosen slot button writes `true` to its column,
    // the other three are `false`. `is_general` stays false — admins flip it
    // during approval if they decide the sentence is timeless.
    const { error: insertErr } = await supabase
      .from("user_suggestions")
      .insert({
        text: trimmed,
        type,
        suggested_by: userRow.nickname?.trim() || userRow.username,
        is_approved: false,
        is_morning:   slot === "morning",
        is_noon:      slot === "noon",
        is_afternoon: slot === "afternoon",
        is_night:     slot === "night",
        is_general:   false,
      });
    setSubmitting(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setSuccess(true);
    window.setTimeout(() => { reset(); onClose(); }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose} dir="rtl">
      <div className="flex-1 bg-ink/40" />
      <aside
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white border-l-[4px] border-ink shadow-[-8px_0_0_0_#0A0A0A] p-6 font-rubik overflow-y-auto animate-[slidein_180ms_ease-out]"
      >
        {success ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-16">
            <div className="text-5xl">🚀</div>
            <h2 className="text-2xl font-black">ההצעה נשלחה לאישור הוועדה הצינית!</h2>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black">הצע משפט חדש</h2>
              <button
                onClick={onClose}
                className="text-2xl font-black border-2 border-ink bg-white w-9 h-9 shadow-[-2px_2px_0_0_#0A0A0A]"
                aria-label="סגור"
              >×</button>
            </div>

            <label className="block mb-4">
              <span className="block font-bold mb-1">מה המשפט המושחז שלך?</span>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={4}
                maxLength={280}
                placeholder="לדוגמה: שרדת תור בקופ״ח של 47 דקות בלי לקלל…"
                className="w-full border-[3px] border-ink p-3 font-medium bg-bgsoft resize-none"
              />
              <span className="block text-xs text-gray-concrete font-bold mt-1">
                {text.trim().length}/280
              </span>
            </label>

            <div className="mb-4">
              <span className="block font-bold mb-2">סוג המשפט</span>
              <div className="flex gap-3">
                <BrutalButton
                  variant={type === "survive" ? "survive" : "ink"}
                  onClick={() => setType("survive")}
                  className="flex-1 text-base"
                >🟢 שרדת</BrutalButton>
                <BrutalButton
                  variant={type === "death" ? "death" : "ink"}
                  onClick={() => setType("death")}
                  className="flex-1 text-base"
                >🔴 מוות</BrutalButton>
              </div>
            </div>

            <div className="mb-4">
              <span className="block font-bold mb-2">מתי המשפט הכי מתאים?</span>
              <div className="grid grid-cols-4 gap-2">
                {SLOT_BUTTONS.map(({ slot: s, label }) => (
                  <button
                    key={s}
                    onClick={() => setSlot(s)}
                    className={[
                      "border-[3px] border-ink py-2 font-black",
                      slot === s
                        ? "bg-survive text-white shadow-[-3px_3px_0_0_#0A0A0A]"
                        : "bg-white text-ink shadow-[-2px_2px_0_0_#0A0A0A]",
                    ].join(" ")}
                  >{label}</button>
                ))}
              </div>
            </div>

            {error && (
              <div className="border-[3px] border-death bg-white p-3 text-death font-bold mb-4">
                {error}
              </div>
            )}

            <BrutalButton
              variant="survive"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full text-base"
            >
              {submitting ? "שולח…" : "שלח לוועדה"}
            </BrutalButton>
          </>
        )}
      </aside>
    </div>
  );
}
