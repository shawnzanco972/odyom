"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { BrutalButton } from "@/components/BrutalButton";
import { Header } from "@/components/Header";
import { OutcomeModal } from "@/components/OutcomeModal";
import { DevPanel, type ForceOutcome } from "@/components/DevPanel";
import { WelcomeGoogleButton } from "@/components/WelcomeGoogleButton";
import { BottomNav } from "@/components/BottomNav";
import { TopNav } from "@/components/TopNav";
import { ManifestoModal } from "@/components/ManifestoModal";
import { RescueModal } from "@/components/RescueModal";
import { LinkGoogleButton } from "@/components/LinkGoogleButton";
import { GameModeTabs, type GameMode } from "@/components/GameModeTabs";
import { CardFlip } from "@/components/CardFlip";
import { CupsGame } from "@/components/CupsGame";
import { WireCutter } from "@/components/WireCutter";
import {
  CommunitySurvivalIndex,
  LiveFeed,
  NextWheelCountdown,
  RiskGauge,
} from "@/components/UrgencyWidgets";
import { useUser } from "@/components/AuthProvider";
import {
  activeSlots,
  activeSlotsForHour,
  istHour,
  nextUnlock,
  todayKeyIST,
} from "@/lib/time";
import type { VerdictResponse } from "./api/verdict/route";

const RouletteWheel = dynamic(
  () => import("@/components/RouletteWheel").then(m => m.RouletteWheel),
  { ssr: false },
);

type Phase = "idle" | "requesting" | "spinning" | "resolved" | "locked";
const INTRO_KEY = "has_seen_intro";
const MANIFESTO_KEY = "has_seen_manifesto";

export default function GamePage() {
  const router = useRouter();
  const { session, userRow, loading: authLoading, refetch } = useUser();

  // Hydration-safe intro gate
  const [mounted, setMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(INTRO_KEY)) {
      setShowIntro(false);
    }
    setMounted(true);
  }, []);
  const dismissIntro = useCallback(() => {
    try { window.localStorage.setItem(INTRO_KEY, "true"); } catch {}
    setShowIntro(false);
  }, []);

  // Manifesto modal — auto-opens for first-time visitors after the intro,
  // and on-demand via the `?` button in the header / TopNav.
  const [manifestoOpen, setManifestoOpen] = useState(false);
  useEffect(() => {
    if (!mounted || showIntro) return;
    try {
      if (!window.localStorage.getItem(MANIFESTO_KEY)) {
        setManifestoOpen(true);
      }
    } catch {}
  }, [mounted, showIntro]);
  const closeManifesto = useCallback(() => {
    try { window.localStorage.setItem(MANIFESTO_KEY, "true"); } catch {}
    setManifestoOpen(false);
  }, []);
  const openManifesto = useCallback(() => setManifestoOpen(true), []);

  // Dev mode
  const [devMode, setDevMode] = useState(false);
  const [forceOutcome, setForceOutcome] = useState<ForceOutcome>("");
  const [mockHour, setMockHour] = useState<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setDevMode(new URLSearchParams(window.location.search).get("dev") === "true");
  }, []);

  // Clock
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const slotState = useMemo(
    () => (mockHour !== null ? activeSlotsForHour(mockHour) : activeSlots(now)),
    [mockHour, now],
  );
  const todayKey = useMemo(() => todayKeyIST(now), [now]);
  const unlockAt = useMemo(() => nextUnlock(now), [now]);

  const alreadyPlayedToday = !devMode && userRow?.last_played_date === todayKey;
  const initialLocked = slotState.locked || alreadyPlayedToday;

  const [phase, setPhase] = useState<Phase>("idle");
  const [activeGameMode, setActiveGameMode] = useState<GameMode>("wheel");
  const [verdict, setVerdict] = useState<VerdictResponse | null>(null);

  // In dev mode the verdict route doesn't persist, so `userRow` won't reflect
  // the just-spun score. Prefer the verdict response's computed totals for
  // display whenever they're available so the UI honestly shows "what would
  // have happened" without polluting the database.
  const streak = verdict?.streak ?? userRow?.current_streak ?? 0;
  const score = verdict?.score ?? userRow?.total_score ?? 0;
  const [modalOpen, setModalOpen] = useState(false);
  const [judgementAt, setJudgementAt] = useState<Date | null>(null);
  const [displayOutcome, setDisplayOutcome] = useState<"survive" | "death" | null>(null);
  const [displayReason, setDisplayReason] = useState<string>("");
  const spinArmedRef = useRef(false);
  const autoShownRef = useRef(false);

  useEffect(() => {
    if (phase === "resolved" || phase === "spinning" || phase === "requesting") return;
    setPhase(initialLocked ? "locked" : "idle");
  }, [initialLocked, phase]);

  useEffect(() => {
    if (authLoading || autoShownRef.current || showIntro) return;
    if (alreadyPlayedToday && userRow?.last_outcome && userRow?.last_reason) {
      autoShownRef.current = true;
      setDisplayOutcome(userRow.last_outcome);
      setDisplayReason(userRow.last_reason);
      setJudgementAt(new Date());
      setModalOpen(true);
    }
  }, [authLoading, alreadyPlayedToday, userRow, showIntro]);

  const handleSpin = useCallback(async () => {
    if (phase !== "idle") return;
    setJudgementAt(new Date());
    setPhase("requesting");
    try {
      // `attempt=true` signals an explicit user spin click — server returns
      // 403 (not a replay payload) if the user is locked out for the day.
      const qs = new URLSearchParams({ attempt: "true" });
      if (devMode) qs.set("dev", "true");
      if (devMode && forceOutcome) qs.set("force", forceOutcome);
      if (devMode && mockHour !== null) qs.set("hour", String(mockHour));
      const res = await fetch(`/api/verdict?${qs}`, { method: "POST" });
      if (res.status === 403) {
        // Locked out — refresh user row so the page reflects the lock state
        // and the auto-show effect opens the replay modal.
        await refetch();
        setPhase("locked");
        return;
      }
      if (!res.ok) throw new Error("verdict failed");
      const v: VerdictResponse = await res.json();
      setVerdict(v);
      if (v.replay) {
        setDisplayOutcome(v.outcome);
        setDisplayReason(v.reasonText);
        setPhase("locked");
        setModalOpen(true);
        return;
      }
      spinArmedRef.current = true;
      setPhase("spinning");
    } catch {
      setPhase("idle");
    }
  }, [phase, devMode, forceOutcome, mockHour, refetch]);

  const handleResolved = useCallback(
    (actualOutcome: "survive" | "death") => {
      if (!verdict) return;
      const reason =
        actualOutcome === verdict.outcome ? verdict.reasonText : verdict.fallbackReasonText;
      setDisplayOutcome(actualOutcome);
      setDisplayReason(reason);
      setPhase("resolved");
      setModalOpen(true);
      void refetch();
    },
    [verdict, refetch],
  );

  const clockStr = (mockHour !== null
    ? new Date(0, 0, 0, mockHour, 0)
    : now
  ).toLocaleTimeString("he-IL", {
    timeZone: mockHour !== null ? undefined : "Asia/Jerusalem",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  if (!mounted) {
    return <div className="min-h-screen bg-bgsoft" />;
  }

  if (showIntro) {
    return (
      <main
        dir="rtl"
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-bgsoft font-rubik animate-[fadein_300ms_ease-out]"
      >
        <h1
          className="font-black text-5xl sm:text-7xl tracking-tight text-center mb-4"
          style={{ textShadow: "4px 4px 0 #ffffff" }}
        >
          לשרוד את היום
        </h1>
        <p className="text-base sm:text-lg font-medium text-gray-concrete text-center max-w-md mb-10">
          מה הם החיים בעצם, אם לא משחק הישרדות יומיומי?
        </p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <BrutalButton variant="survive" onClick={dismissIntro} className="text-lg py-4">
            כנס ותהמר על החיים שלך 🎲
          </BrutalButton>
          <WelcomeGoogleButton onSuccess={dismissIntro} />
        </div>
      </main>
    );
  }

  const buttonLabel = (() => {
    if (authLoading) return "טוען…";
    if (phase === "locked" && slotState.locked) return "המשחק נפתח ב־08:00";
    if (phase === "locked" && alreadyPlayedToday) return "חזור מחר ב־08:00";
    if (phase === "idle") return "סובב את הגלגל";
    if (phase === "requesting") return "טוען…";
    if (phase === "spinning") return "הגלגל מסתובב…";
    return "סיימת להיום";
  })();

  return (
    <div className="min-h-screen pb-28 md:pb-12 animate-[fadein_300ms_ease-out] bg-white" dir="rtl">
      <TopNav onOpenManifesto={openManifesto} />

      {/* Mobile-only status chips (keeps streak/clock/score one tap away) */}
      <div className="md:hidden">
        <Header streak={streak} score={score} clock={clockStr} onOpenManifesto={openManifesto} />
      </div>

      {/* ───────────────────────── HERO: WHEEL + BUTTON ─────────────────────────
          Sized to dominate the initial viewport on both mobile and desktop. */}
      <section
        className="
          flex flex-col items-center justify-center px-4
          min-h-[calc(100vh-130px)] md:min-h-[calc(100vh-90px)]
          gap-5 md:gap-7
        "
      >
        {/* Compact title bar */}
        <div className="text-center">
          <h1
            className="font-black text-3xl md:text-5xl tracking-tight leading-none"
            style={{ textShadow: "3px 3px 0 #ffffff" }}
          >
            לשרוד את היום
          </h1>
          <p className="text-xs md:text-sm text-gray-concrete font-bold mt-1.5">
            פלחים על הגלגל: {slotState.ballsDropped} · 🔴 1 · 🟢 {slotState.ballsDropped - 1}
          </p>
        </div>

        {/* Mode selector — visible only while idle */}
        {phase === "idle" && !alreadyPlayedToday && (
          <GameModeTabs active={activeGameMode} onChange={setActiveGameMode} />
        )}

        {/* MIDDLE — the arcade arena */}
        <div className="flex items-center justify-center w-full">
          <div className="flex-1 max-w-[min(640px,90vw,75vh)]">
            {activeGameMode === "wheel" && (
              <RouletteWheel
                totalSlices={slotState.ballsDropped}
                outcome={verdict?.outcome ?? "survive"}
                spin={phase === "spinning" && spinArmedRef.current}
                onResolved={handleResolved}
              />
            )}
            {activeGameMode === "cards" && (
              <CardFlip
                totalSlices={slotState.ballsDropped}
                outcome={verdict?.outcome ?? "survive"}
                spin={phase === "spinning" && spinArmedRef.current}
                onResolved={handleResolved}
                onPlay={handleSpin}
              />
            )}
            {activeGameMode === "cups" && (
              <CupsGame
                totalSlices={slotState.ballsDropped}
                outcome={verdict?.outcome ?? "survive"}
                spin={phase === "spinning" && spinArmedRef.current}
                onResolved={handleResolved}
                onPlay={handleSpin}
              />
            )}
            {activeGameMode === "wires" && (
              <WireCutter
                totalSlices={slotState.ballsDropped}
                outcome={verdict?.outcome ?? "survive"}
                spin={phase === "spinning" && spinArmedRef.current}
                onResolved={handleResolved}
                onPlay={handleSpin}
              />
            )}
          </div>
        </div>

        {/* Below-arena: risk gauge + next-wheel countdown (compact, no boxes) */}
        <div className="w-full max-w-md flex flex-col gap-2">
          <RiskGauge ballsDropped={slotState.ballsDropped} orientation="horizontal" />
          <NextWheelCountdown />
        </div>

        {/* Spin button — only for wheel mode */}
        {activeGameMode === "wheel" && (
          <BrutalButton
            variant={phase === "locked" ? "ink" : "survive"}
            disabled={phase !== "idle" || authLoading}
            onClick={handleSpin}
            className="w-full max-w-md text-xl md:text-2xl py-5"
          >
            {buttonLabel}
          </BrutalButton>
        )}
      </section>

      {/* Anonymous → Google upgrade prompt (only renders when user is anon) */}
      <div className="max-w-md mx-auto px-4 mt-2">
        <LinkGoogleButton />
      </div>

      {/* Visual divider between hero and secondary widgets */}
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="border-t-4 border-ink/80 my-6" />
        <p className="text-center text-xs md:text-sm font-black tracking-widest text-gray-concrete uppercase mb-5">
          מה קורה ברחבי הארץ
        </p>
      </div>

      {/* ───────────────────────── SECONDARY: WIDGETS ───────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CommunitySurvivalIndex />
          <LiveFeed />
        </div>
      </section>

      {modalOpen && judgementAt && displayOutcome && (
        <OutcomeModal
          outcome={displayOutcome}
          reasonText={displayReason}
          unlockAt={unlockAt}
          judgementAt={judgementAt}
          hour={mockHour ?? istHour(judgementAt)}
          streak={streak}
          score={score}
          ballsDropped={slotState.ballsDropped}
          gameMode={activeGameMode}
          userId={session?.user?.id ?? null}
          onProfile={() => {
            setModalOpen(false);
            setPhase(devMode ? "idle" : "locked");
            router.push("/account");
          }}
          onLeaderboard={() => {
            setModalOpen(false);
            setPhase(devMode ? "idle" : "locked");
            router.push("/leaderboard");
          }}
          onClose={() => { setModalOpen(false); setPhase(devMode ? "idle" : "locked"); }}
        />
      )}

      {/* Streak rescue celebration — fires when a friend's first play
          resurrects the user's streak. Renders above the outcome modal so the
          good news lands first. */}
      <RescueModal
        open={!!userRow?.rescue_pending}
        onAcknowledged={() => void refetch()}
      />

      {devMode && (
        <DevPanel
          forceOutcome={forceOutcome}
          setForceOutcome={setForceOutcome}
          mockHour={mockHour}
          setMockHour={setMockHour}
          onResetLockout={() => { /* dev mode bypasses lockout server-side */ }}
          onWiped={() => {
            setVerdict(null);
            setDisplayOutcome(null);
            setDisplayReason("");
            setModalOpen(false);
            void refetch();
          }}
        />
      )}

      <BottomNav />

      <ManifestoModal open={manifestoOpen} onClose={closeManifesto} />
    </div>
  );
}
