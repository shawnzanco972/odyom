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
import {
  LiveFeed,
  NextWheelCountdown,
  RiskGauge,
  SurvivalChance,
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

export default function GamePage() {
  const router = useRouter();
  const { userRow, loading: authLoading, refetch } = useUser();

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

  const streak = userRow?.current_streak ?? 0;
  const score = userRow?.total_score ?? 0;
  const alreadyPlayedToday = !devMode && userRow?.last_played_date === todayKey;
  const initialLocked = slotState.locked || alreadyPlayedToday;

  const [phase, setPhase] = useState<Phase>("idle");
  const [verdict, setVerdict] = useState<VerdictResponse | null>(null);
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
      const qs = new URLSearchParams();
      if (devMode) qs.set("dev", "true");
      if (devMode && forceOutcome) qs.set("force", forceOutcome);
      if (devMode && mockHour !== null) qs.set("hour", String(mockHour));
      const res = await fetch(`/api/verdict${qs.toString() ? "?" + qs : ""}`, {
        method: "POST",
      });
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
  }, [phase, devMode, forceOutcome, mockHour]);

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

  return (
    <div className="min-h-screen pb-28 md:pb-12 animate-[fadein_300ms_ease-out] bg-white">
      <TopNav />

      {/* Mobile header keeps the streak/clock/score chips */}
      <div className="md:hidden">
        <Header streak={streak} score={score} clock={clockStr} />
      </div>

      <main className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-8 flex flex-col gap-6">
        {/* Title row + desktop stats */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-center md:text-right">
            <h1
              className="font-black text-3xl md:text-5xl tracking-tight leading-none"
              style={{ textShadow: "3px 3px 0 #ffffff" }}
            >
              לשרוד את היום
            </h1>
            <p className="text-sm md:text-base text-gray-concrete font-bold mt-1">
              פלחים על הגלגל: {slotState.ballsDropped} · 🔴 1 · 🟢 {slotState.ballsDropped - 1}
            </p>
          </div>
          {/* Desktop-only quick stats */}
          <div className="hidden md:flex gap-3 font-rubik">
            <div className="bg-white border-2 border-ink shadow-[3px_3px_0_0_#0A0A0A] px-3 py-2 text-sm font-black">
              🔥 רצף: {streak}
            </div>
            <div className="bg-white border-2 border-ink shadow-[3px_3px_0_0_#0A0A0A] px-3 py-2 text-sm font-black tracking-wider">
              שעה: {clockStr}
            </div>
            <div className="bg-white border-2 border-ink shadow-[3px_3px_0_0_#0A0A0A] px-3 py-2 text-sm font-black">
              🏆 {score.toLocaleString("he-IL")} נק׳
            </div>
          </div>
        </div>

        {/* Desktop: 3-column grid (live feed | wheel+gauge | urgency stats).
            Mobile: stacked. */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-8 items-start">
          {/* Left column (desktop): live feed. Mobile: appears later. */}
          <div className="hidden md:block">
            <LiveFeed />
          </div>

          {/* Wheel + risk gauge cluster */}
          <div className="flex flex-row-reverse items-center justify-center gap-4 mx-auto">
            <RouletteWheel
              totalSlices={slotState.ballsDropped}
              outcome={verdict?.outcome ?? "survive"}
              spin={phase === "spinning" && spinArmedRef.current}
              onResolved={handleResolved}
            />
            <RiskGauge ballsDropped={slotState.ballsDropped} />
          </div>

          {/* Right column (desktop): urgency stats. Mobile: appears later. */}
          <div className="hidden md:flex flex-col gap-3">
            <SurvivalChance ballsDropped={slotState.ballsDropped} />
            <NextWheelCountdown />
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <BrutalButton
            variant={phase === "locked" ? "ink" : "survive"}
            disabled={phase !== "idle" || authLoading}
            onClick={handleSpin}
            className="w-full max-w-sm"
          >
            {authLoading && "טוען…"}
            {!authLoading && phase === "locked" && slotState.locked && "המשחק נפתח ב־08:00"}
            {!authLoading && phase === "locked" && !slotState.locked && alreadyPlayedToday && "חזור מחר ב־08:00"}
            {!authLoading && phase === "idle" && "סובב את הגלגל"}
            {!authLoading && phase === "requesting" && "טוען…"}
            {!authLoading && phase === "spinning" && "הגלגל מסתובב…"}
            {!authLoading && phase === "resolved" && "סיימת להיום"}
          </BrutalButton>
        </div>

        {/* Mobile-only: urgency widgets stacked below the wheel */}
        <div className="md:hidden flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <SurvivalChance ballsDropped={slotState.ballsDropped} />
            <NextWheelCountdown />
          </div>
          <LiveFeed />
        </div>
      </main>

      {modalOpen && judgementAt && displayOutcome && (
        <OutcomeModal
          outcome={displayOutcome}
          reasonText={displayReason}
          unlockAt={unlockAt}
          judgementAt={judgementAt}
          hour={mockHour ?? istHour(judgementAt)}
          streak={streak}
          score={score}
          onPrimary={() => {
            setModalOpen(false);
            setPhase(devMode ? "idle" : "locked");
            router.push("/leaderboard");
          }}
          onSecondary={() => { setModalOpen(false); setPhase(devMode ? "idle" : "locked"); }}
        />
      )}

      {devMode && (
        <DevPanel
          forceOutcome={forceOutcome}
          setForceOutcome={setForceOutcome}
          mockHour={mockHour}
          setMockHour={setMockHour}
          onResetLockout={() => { /* dev mode bypasses lockout server-side */ }}
        />
      )}

      <BottomNav />
    </div>
  );
}
