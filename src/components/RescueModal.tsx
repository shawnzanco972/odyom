"use client";
import { useState } from "react";
import { BrutalButton } from "./BrutalButton";

interface Props {
  open: boolean;
  onAcknowledged: () => void;
}

export function RescueModal({ open, onAcknowledged }: Props) {
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handleAck = async () => {
    setBusy(true);
    try {
      await fetch("/api/ack-rescue", { method: "POST" });
    } catch {
      // Silently swallow — the worst case is the user sees the modal one
      // extra time on their next visit. Better than a confusing error.
    }
    setBusy(false);
    onAcknowledged();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[65] bg-ink/40 flex items-center justify-center p-4 font-rubik animate-[fadein_220ms_ease-out]"
    >
      <div
        style={{ backgroundColor: "#C4EAB4" }}
        className="relative w-full max-w-md border-[4px] border-[#106B01] shadow-[-8px_8px_0_0_#0A0A0A] p-6 md:p-8 text-center"
      >
        {/* Faint background emoji watermark */}
        <div aria-hidden className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
          <span className="text-[160px] select-none">🛟</span>
        </div>

        <div className="relative z-10">
          <h2
            className="font-black uppercase tracking-tighter text-ink leading-none mb-5"
            style={{
              fontSize: "clamp(2rem, 7vw, 3rem)",
              textShadow: "4px 4px 0 #ffffff",
            }}
          >
            החבר שלך הצטרף! 🛟
          </h2>

          <p className="text-base md:text-lg font-bold text-ink mb-6">
            הרצף שלך ניצל וחזר לחיים. שיחקו אותה.
          </p>

          <BrutalButton
            variant="survive"
            onClick={handleAck}
            disabled={busy}
            className="w-full text-base md:text-lg py-3"
          >
            {busy ? "טוען…" : "יאללה, חזרתי למשחק"}
          </BrutalButton>
        </div>
      </div>
    </div>
  );
}
