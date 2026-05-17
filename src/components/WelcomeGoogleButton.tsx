"use client";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { BrutalButton } from "@/components/BrutalButton";

export function WelcomeGoogleButton({ onSuccess }: { onSuccess: () => void }) {
  const supabase = getBrowserClient();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!supabase) return;
    setBusy(true);
    onSuccess(); // dismiss intro optimistically — user will land back here authed
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      console.error("google sign-in failed:", error.message);
      setBusy(false);
    }
  };

  return (
    <BrutalButton
      variant="ink"
      disabled={busy}
      onClick={handleClick}
      className="text-base py-3"
    >
      המשך עם Google 👤
    </BrutalButton>
  );
}
