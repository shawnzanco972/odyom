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
  className?: string;
}

export function ShareButton({ outcome, streak, reason, referrerId, className }: Props) {
  const [result, setResult] = useState<ShareResult | null>(null);

  const baseLabel = outcome === "survive" ? "שתף 📤" : "שתף ותציל אותי 🛟";
  const label = (() => {
    if (result === "copied") return "הועתק! ✓";
    if (result === "shared") return "שותף ✓";
    if (result === "failed") return baseLabel;
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

  // Crimson on death, deep green on survive — matches the modal's accent color
  // so the primary action visually belongs to its parent.
  const accentBg = outcome === "survive" ? "bg-[#106B01]" : "bg-[#DC2626]";

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
