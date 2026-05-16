"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BrutalButton } from "@/components/BrutalButton";
import { Header } from "@/components/Header";
import { OutcomeModal } from "@/components/OutcomeModal";
import { DevPanel, type ForceOutcome } from "@/components/DevPanel";
import {
  activeSlots,
  activeSlotsForHour,
  closedSlotIndices,
  istHour,
  nextUnlock,
  todayKeyIST,
} from "@/lib/time";
import type { VerdictResponse } from "./api/verdict/route";

const Pegboard = dynamic(
  () => import("@/components/Pegboard").then(m => m.Pegboard),
  { ssr: false },
);

type Phase = "idle" | "requesting" | "dropping" | "resolved" | "locked";

interface PersistedState {
  lastPlayedDate: string | null;
  streak: number;
  score: number;
  lastOutcome: "survive" | "death" | null;
}

const STORAGE_KEY = "odyom.state.v1";

function loadPersisted(): PersistedState {
  if (typeof window === "undefined")
    return { lastPlayedDate: null, streak: 0, score: 0, lastOutcome: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedState;
  } catch {}
  return { lastPlayedDate: null, streak: 0, score: 0, lastOutcome: null };
}

function savePersisted(s: PersistedState) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export default function GamePage() {
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

  // Persistence
  const [persisted, setPersisted] = useState<PersistedState>(() => loadPersisted());
  useEffect(() => { setPersisted(loadPersisted()); }, []);
  const alreadyPlayedToday = persisted.lastPlayedDate === todayKey;
  const initialLocked = !devMode && (slotState.locked || alreadyPlayedToday);

  // Game state
  const [phase, setPhase] = useState<Phase>(initialLocked ? "locked" : "idle");
  const [verdict, setVerdict] = useState<VerdictResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [judgementAt, setJudgementAt] = useState<Date | null>(null);
  const [displayOutcome, setDisplayOutcome] = useState<"survive" | "death" | null>(null);
  const [displayReason, setDisplayReason] = useState<string>("");
  const dropArmedRef = useRef(false);

  useEffect(() => {
    if (phase === "resolved" || phase === "dropping" || phase === "requesting") return;
    setPhase(!devMode && (slotState.locked || alreadyPlayedToday) ? "locked" : "idle");
  }, [slotState.locked, alreadyPlayedToday, phase, devMode]);

  const handleDrop = useCallback(async () => {
    if (phase !== "idle") return;
    setJudgementAt(new Date());
    setPhase("requesting");
    try {
      const qs = new URLSearchParams();
      if (devMode && forceOutcome) qs.set("force", forceOutcome);
      if (devMode && mockHour !== null) qs.set("hour", String(mockHour));
      const res = await fetch(`/api/verdict${qs.toString() ? "?" + qs : ""}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("verdict failed");
      const v: VerdictResponse = await res.json();
      setVerdict(v);
      dropArmedRef.current = true;
      setPhase("dropping");
    } catch {
      setPhase("idle");
    }
  }, [phase, devMode, forceOutcome, mockHour]);

  // Pegboard now reports the physically-derived outcome directly. We use
  // verdict reason texts but pick the matching one for the actual result.
  const handleResolved = useCallback(
    (actualOutcome: "survive" | "death") => {
      if (!verdict) return;
      const reason =
        actualOutcome === verdict.outcome
          ? verdict.reasonText
          : verdict.fallbackReasonText;

      setDisplayOutcome(actualOutcome);
      setDisplayReason(reason);

      const updated: PersistedState = {
        lastPlayedDate: todayKey,
        streak: actualOutcome === "survive" ? persisted.streak + 1 : 0,
        score: persisted.score + (actualOutcome === "survive" ? 10 + slotState.closedCount : 0),
        lastOutcome: actualOutcome,
      };
      setPersisted(updated);
      if (!devMode) savePersisted(updated);
      setPhase("resolved");
      setModalOpen(true);
    },
    [verdict, persisted, todayKey, slotState.closedCount, devMode],
  );

  const resetLockout = useCallback(() => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    setPersisted({ lastPlayedDate: null, streak: 0, score: 0, lastOutcome: null });
    setVerdict(null);
    setDisplayOutcome(null);
    setDisplayReason("");
    setModalOpen(false);
    dropArmedRef.current = false;
    setPhase("idle");
  }, []);

  const clockStr = (mockHour !== null
    ? new Date(0, 0, 0, mockHour, 0)
    : now
  ).toLocaleTimeString("he-IL", {
    timeZone: mockHour !== null ? undefined : "Asia/Jerusalem",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  // Closed-slot layout — verdict overrides if present (server-authoritative).
  const closedIdx = useMemo(
    () => verdict?.closedSlotIndices ?? closedSlotIndices(slotState.closedCount, todayKey),
    [verdict?.closedSlotIndices, slotState.closedCount, todayKey],
  );

  return (
    <main className="min-h-screen flex flex-col items-stretch gap-5 py-4">
      <Header streak={persisted.streak} score={persisted.score} clock={clockStr} />

      <div className="w-full max-w-3xl mx-auto px-4 flex flex-col items-center gap-4">
        <div className="w-full flex items-baseline justify-between font-rubik">
          <span className="text-sm text-gray-concrete font-bold">
            כיסאות פתוחים: {slotState.openCount}
          </span>
          <h1 className="text-2xl font-black tracking-tight">לשרוד את היום</h1>
          <span className="text-sm text-gray-concrete font-bold">
            כדורים: {slotState.ballsDropped}
          </span>
        </div>

        <Pegboard
          ballsToDrop={slotState.ballsDropped}
          closedIndices={closedIdx}
          outcome={verdict?.outcome ?? "survive"}
          start={phase === "dropping" && dropArmedRef.current}
          onResolved={handleResolved}
        />

        <BrutalButton
          variant={phase === "locked" ? "ink" : "survive"}
          disabled={phase !== "idle"}
          onClick={handleDrop}
          className="mt-2"
        >
          {phase === "locked" && slotState.locked && "המשחק נפתח ב־08:00"}
          {phase === "locked" && !slotState.locked && alreadyPlayedToday && "חזור מחר ב־08:00"}
          {phase === "idle" && "שחק עכשיו"}
          {phase === "requesting" && "טוען…"}
          {phase === "dropping" && "הכדורים נופלים…"}
          {phase === "resolved" && "סיימת להיום"}
        </BrutalButton>
      </div>

      {modalOpen && verdict && judgementAt && displayOutcome && (
        <OutcomeModal
          outcome={displayOutcome}
          reasonText={displayReason}
          unlockAt={unlockAt}
          judgementAt={judgementAt}
          hour={mockHour ?? istHour(judgementAt)}
          streak={persisted.streak}
          score={persisted.score}
          onPrimary={() => { setModalOpen(false); setPhase(devMode ? "idle" : "locked"); }}
          onSecondary={() => { setModalOpen(false); setPhase(devMode ? "idle" : "locked"); }}
        />
      )}

      {devMode && (
        <DevPanel
          forceOutcome={forceOutcome}
          setForceOutcome={setForceOutcome}
          mockHour={mockHour}
          setMockHour={setMockHour}
          onResetLockout={resetLockout}
        />
      )}
    </main>
  );
}
