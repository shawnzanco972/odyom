"use client";
import { useState } from "react";
import { buildShareText, buildShareUrl, shareOrCopy, type ShareResult } from "@/lib/share";

interface Props {
  outcome: "survive" | "death";
  streak: number;
  reason: string;
  /** Current user's own UUID — embedded in the share URL so any new sign-up
   *  via this link wires through the rescue loop back to them. */
  referrerId: string | null;
  /** Compact pill variant used inside dialogs/cards (smaller, less padding). */
  compact?: boolean;
  className?: string;
}

export function ShareButton({ outcome, streak, reason, referrerId, compact, className }: Props) {
  const [result, setResult] = useState<ShareResult | null>(null);

  const baseLabel = outcome === "survive" ? "שתף 📤" : "שתף ותציל אותי 🛟";
  const label = (() => {
    if (result === "copied") return "הועתק! ✓";
    if (result === "shared") return "שותף ✓";
    return baseLabel;
  })();

  const handleClick = async () => {
    const text = buildShareText({ outcome, streak, reason, referrerId });
    const url = buildShareUrl(referrerId);
    const r = await shareOrCopy(text, url);
    setResult(r);
    if (r === "copied" || r === "shared") {
      window.setTimeout(() => setResult(null), 1800);
    }
  };

  const accentBg = outcome === "survive" ? "bg-[#106B01]" : "bg-[#DC2626]";

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={[
          accentBg,
          "text-white border-[3px] border-ink rounded-lg",
          "py-2.5 px-4 font-black text-base",
          "shadow-[3px_3px_0_0_#0A0A0A]",
          "active:translate-x-[-3px] active:translate-y-[3px] active:shadow-none",
          "transition-transform duration-75",
          "flex items-center justify-center gap-2 whitespace-nowrap",
          className ?? "",
        ].join(" ")}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={[
        accentBg,
        "text-white border-[3px] border-ink rounded-lg",
        "py-4 px-6 font-black text-xl",
        "shadow-[6px_6px_0_0_#0A0A0A]",
        "active:translate-x-[-6px] active:translate-y-[6px] active:shadow-none",
        "transition-transform duration-75",
        "flex items-center justify-center gap-3",
        className ?? "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
