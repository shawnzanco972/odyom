"use client";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { BrutalButton } from "@/components/BrutalButton";

export function WelcomeGoogleButton({ onSuccess }: { onSuccess: () => void }) {
  const supabase = getBrowserClient();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!supabase) {
      window.alert("Supabase לא מוגדר. בדוק את משתני הסביבה.");
      return;
    }
    setBusy(true);
    try {
      // Note: do NOT call onSuccess() before signInWithOAuth — dismissing the
      // intro unmounts this component mid-redirect and can cancel the flow.
      // AuthProvider will dismiss the intro naturally once the user returns
      // authenticated (or we'll re-enable the button if OAuth fails).
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        // Surface the real Supabase error so config issues are obvious.
        console.error("[google sign-in failed]", error);
        window.alert(`Google sign-in failed:\n${error.message}\n\nCheck Supabase → Auth → URL Configuration → Redirect URLs.`);
        setBusy(false);
        return;
      }
      // On success, the browser is redirected by Supabase. If we somehow get
      // here without a redirect, dismiss the intro so the game still loads.
      onSuccess();
    } catch (e) {
      console.error("[google sign-in threw]", e);
      window.alert(`Unexpected error: ${(e as Error)?.message ?? e}`);
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
      {busy ? "מעביר ל-Google…" : "המשך עם Google 👤"}
    </BrutalButton>
  );
}
