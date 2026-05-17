"use client";
import { useState } from "react";
import { useUser } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabase/browser";
import { BrutalButton } from "@/components/BrutalButton";

const TIER_LABELS = ["בוקר", "צהריים", "אחה״צ", "לילה"] as const;

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
  const [tier, setTier] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setText(""); setType(null); setTier(1);
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
    if (!userRow) {
      setError("נדרשת התחברות");
      return;
    }
    setSubmitting(true);
    const { error: insertErr } = await supabase
      .from("user_suggestions")
      .insert({
        text: trimmed,
        type,
        tier: type === "survive" ? tier : null,
        suggested_by: userRow.nickname?.trim() || userRow.username,
        is_approved: false,
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
        style={{
          // simple slide animation via inline keyframes (avoids tailwind plugin)
        }}
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

            {type === "survive" && (
              <div className="mb-4">
                <span className="block font-bold mb-2">מתי המשפט מתאים?</span>
                <div className="grid grid-cols-4 gap-2">
                  {TIER_LABELS.map((label, i) => {
                    const t = (i + 1) as 1 | 2 | 3 | 4;
                    return (
                      <button
                        key={t}
                        onClick={() => setTier(t)}
                        className={[
                          "border-[3px] border-ink py-2 font-black",
                          tier === t
                            ? "bg-survive text-white shadow-[-3px_3px_0_0_#0A0A0A]"
                            : "bg-white text-ink shadow-[-2px_2px_0_0_#0A0A0A]",
                        ].join(" ")}
                      >{label}</button>
                    );
                  })}
                </div>
              </div>
            )}

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
