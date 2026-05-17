"use client";
import { useState } from "react";
import { useUser } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabase/browser";
import { BrutalButton } from "@/components/BrutalButton";

export function LinkGoogleButton({ compact = false }: { compact?: boolean }) {
  const { session } = useUser();
  const supabase = getBrowserClient();
  const [busy, setBusy] = useState(false);

  // Only visible to anonymous users (Supabase marks anon sessions).
  const isAnon = session?.user?.is_anonymous === true;
  if (!session || !isAnon) return null;

  const handleLink = async () => {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      console.error("link google failed:", error.message);
      setBusy(false);
    }
    // On success, browser is redirected to Google.
  };

  if (compact) {
    return (
      <BrutalButton
        variant="ink"
        onClick={handleLink}
        disabled={busy}
        className="text-xs"
      >
        🔐 גבה עם Google
      </BrutalButton>
    );
  }

  return (
    <div
      dir="rtl"
      className="bg-bgsoft border-[3px] border-ink shadow-[-4px_4px_0_0_#0A0A0A] p-4 mb-5 font-rubik"
    >
      <div className="font-black mb-1">⚠️ אל תאבד את הסטריק שלך!</div>
      <p className="text-sm text-gray-concrete font-bold mb-3">
        חבר את החשבון ל-Google כדי לשמור את הרצף ולשחק מכל מכשיר.
      </p>
      <BrutalButton variant="survive" onClick={handleLink} disabled={busy} className="text-sm">
        {busy ? "מעביר ל-Google…" : "גבה את החשבון עם Google"}
      </BrutalButton>
    </div>
  );
}
