"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/browser";
import { normalizeUserRow, type UserRow } from "@/lib/supabase/types";
import { captureReferral, consumePendingReferral } from "@/lib/referral";

interface AuthContextValue {
  session: Session | null;
  userRow: UserRow | null;
  loading: boolean;
  refetch: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [userRow, setUserRow] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserRow = useCallback(
    async (uid: string) => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", uid)
        .single();
      if (error) {
        // Trigger may not have completed yet — retry once shortly.
        await new Promise(r => setTimeout(r, 400));
        const retry = await supabase.from("users").select("*").eq("id", uid).single();
        setUserRow(retry.data ? normalizeUserRow(retry.data) : null);
      } else {
        setUserRow(data ? normalizeUserRow(data) : null);
      }
    },
    [supabase],
  );

  useEffect(() => {
    // Capture ?ref=<uuid> from the URL before any auth work happens, so it
    // survives the OAuth round-trip (in-app browsers like WhatsApp lose
    // sessionStorage during external redirects — referral.ts uses localStorage).
    captureReferral();

    // No client available (env vars missing) — stay un-authed silently so the
    // rest of the app still renders. Game state will just be ephemeral.
    if (!supabase) { setLoading(false); return; }

    let unsub: (() => void) | null = null;
    (async () => {
      const { data: { session: existing } } = await supabase.auth.getSession();
      let s = existing;
      let isFreshSignup = false;
      if (!s) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error("Anonymous sign-in failed:", error.message);
          setLoading(false);
          return;
        }
        s = data.session;
        isFreshSignup = true;
      }
      setSession(s);

      if (s?.user) {
        // For fresh signups, persist a pending referrer (if any) onto the new
        // users row. This must run after the trigger has created the row — the
        // `loadUserRow` retry handles that timing implicitly.
        if (isFreshSignup) {
          const ref = consumePendingReferral();
          if (ref && ref !== s.user.id) {
            await supabase
              .from("users")
              .update({ referrer_id: ref })
              .eq("id", s.user.id);
          }
        }
        await loadUserRow(s.user.id);
      }
      setLoading(false);

      const sub = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) loadUserRow(newSession.user.id);
      });
      unsub = () => sub.data.subscription.unsubscribe();
    })();
    return () => { unsub?.(); };
  }, [supabase, loadUserRow]);

  const refetch = useCallback(async () => {
    if (session?.user) await loadUserRow(session.user.id);
  }, [session, loadUserRow]);

  const updateNickname = useCallback(
    async (nickname: string) => {
      if (!supabase || !session?.user) return { error: "not signed in" };
      const trimmed = nickname.trim();
      if (trimmed.length < 2 || trimmed.length > 18)
        return { error: "כינוי חייב להיות 2 עד 18 תווים" };
      const { error } = await supabase
        .from("users")
        .update({ nickname: trimmed })
        .eq("id", session.user.id);
      if (error) return { error: error.message };
      setUserRow(r => (r ? { ...r, nickname: trimmed } : r));
      return { error: null };
    },
    [session, supabase],
  );

  return (
    <AuthContext.Provider value={{ session, userRow, loading, refetch, updateNickname }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useUser(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useUser must be used inside <AuthProvider>");
  return ctx;
}
