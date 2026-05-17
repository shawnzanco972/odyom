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
    if (!supabase) {
      window.alert("Supabase לא מוגדר.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        console.error("[link google failed]", error);

        // The Google identity is already bound to another Supabase user
        // (typically: user linked once, then tried again from a different
        // browser/device with a fresh anonymous session). Recover by signing
        // them into the existing Google-linked account instead of trying to
        // link the current anonymous one — they lose their anon progress but
        // they're now on the right account everywhere.
        if (/identity.*already.*exists|already.*linked/i.test(error.message)) {
          const ok = window.confirm(
            "החשבון הזה של Google כבר מקושר אצלנו. רוצה להתחבר אליו ישירות? (המשתמש האנונימי הנוכחי יוחלף.)",
          );
          if (ok) {
            const { error: signInErr } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: `${window.location.origin}/auth/callback` },
            });
            if (signInErr) {
              window.alert(`Sign-in failed:\n${signInErr.message}`);
              setBusy(false);
            }
            return;
          }
          setBusy(false);
          return;
        }

        const hint =
          /manual linking/i.test(error.message)
            ? "Enable Supabase → Auth → Sign In/Up → 'Allow manual linking'."
            : /redirect/i.test(error.message)
            ? "Check Supabase → Auth → URL Configuration → Redirect URLs."
            : "Check the Supabase Auth settings.";
        window.alert(`Google linking failed:\n${error.message}\n\n${hint}`);
        setBusy(false);
        return;
      }
      // On success the browser is redirected to Google.
    } catch (e) {
      console.error("[link google threw]", e);
      window.alert(`Unexpected error: ${(e as Error)?.message ?? e}`);
      setBusy(false);
    }
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
