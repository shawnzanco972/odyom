"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { BrutalButton } from "./BrutalButton";

export function SignOutButton() {
  const supabase = getBrowserClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <BrutalButton
      variant="ink"
      disabled={busy || !supabase}
      onClick={async () => {
        if (!supabase) return;
        setBusy(true);
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="text-sm py-2 px-4"
    >
      {busy ? "מתנתק…" : "התנתק"}
    </BrutalButton>
  );
}
