// IST time math for the Plinko slot logic (GAME_SPEC §2).
const TZ = "Asia/Jerusalem";
const TOTAL_SLOTS = 32;
const MIN_ACTIVE = 2;
const START_HOUR = 8; // 08:00 IST

// Returns { y, mo, d, h, mi } in IST regardless of host locale.
function istParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  return {
    y: +parts.year, mo: +parts.month, day: +parts.day,
    h: +parts.hour % 24, mi: +parts.minute,
  };
}

export function todayKeyIST(now: Date = new Date()): string {
  const p = istParts(now);
  return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function istHour(now: Date = new Date()): number {
  return istParts(now).h;
}

// Minutes since 08:00 IST today (negative if before).
function minutesSinceStart(now: Date): number {
  const p = istParts(now);
  return (p.h - START_HOUR) * 60 + p.mi;
}

// MUSICAL CHAIRS rules:
//   ballsDropped = max(2, 32 - intervals)
//   openCount    = ballsDropped - 1   (always one fewer chair than ball)
//   closedCount  = 32 - openCount
export interface SlotState {
  ballsDropped: number;
  openCount: number;
  closedCount: number;
  locked: boolean;
}

function deriveSlots(intervals: number): SlotState {
  const ballsDropped = Math.max(MIN_ACTIVE, TOTAL_SLOTS - intervals);
  const openCount = Math.max(1, ballsDropped - 1);
  return {
    ballsDropped,
    openCount,
    closedCount: TOTAL_SLOTS - openCount,
    locked: false,
  };
}

export function activeSlots(now: Date = new Date()): SlotState {
  const m = minutesSinceStart(now);
  if (m < 0) {
    return { ballsDropped: TOTAL_SLOTS, openCount: TOTAL_SLOTS - 1, closedCount: 1, locked: true };
  }
  return deriveSlots(Math.floor(m / 30));
}

// Dev override: compute slot state from an arbitrary IST hour (+ optional minute).
export function activeSlotsForHour(hour: number, minute = 0): SlotState {
  if (hour < START_HOUR) {
    return { ballsDropped: TOTAL_SLOTS, openCount: TOTAL_SLOTS - 1, closedCount: 1, locked: true };
  }
  return deriveSlots(Math.floor(((hour - START_HOUR) * 60 + minute) / 30));
}

// Next 08:00 IST after `now`. Returned as a real Date (UTC instant).
export function nextUnlock(now: Date = new Date()): Date {
  const p = istParts(now);
  // If before 08:00 today IST, unlock is today; else tomorrow.
  const beforeStart = p.h < START_HOUR;
  const day = beforeStart ? p.day : p.day + 1;
  // Build a UTC instant for the IST 08:00 wall clock by trial: IST = UTC+2 or +3 (DST).
  // We construct candidate UTC then verify via istParts; adjust by ±1h if needed.
  let utcGuess = Date.UTC(p.y, p.mo - 1, day, START_HOUR - 3, 0, 0);
  for (let i = 0; i < 4; i++) {
    const g = istParts(new Date(utcGuess));
    if (g.h === START_HOUR && g.mi === 0 && g.day === day) return new Date(utcGuess);
    const delta = (START_HOUR - g.h) * 60 - g.mi;
    utcGuess += delta * 60_000;
  }
  return new Date(utcGuess);
}

export const SLOT_COUNT = TOTAL_SLOTS;

// --- Deterministic closed-slot layout ----------------------------------------
// Each day gets a fixed shuffle order of all 32 slot indices. The first
// `closedCount` of that shuffle are "closed" — so each passing 30-min interval
// adds exactly one new slot to the closed set, but the closures are scattered
// pseudo-randomly across the bar instead of marching left-to-right. Client and
// server use the same util so the visual layout pre-click matches the server's
// targetSlot pick.
function mulberry32(seed: number) {
  return function () {
    let t = (seed = (seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function closedSlotIndices(closedCount: number, dayKey: string): number[] {
  if (closedCount <= 0) return [];
  const rng = mulberry32(strHash(dayKey));
  const all = Array.from({ length: TOTAL_SLOTS }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, Math.min(closedCount, TOTAL_SLOTS)).sort((a, b) => a - b);
}

export function openSlotIndices(closedCount: number, dayKey: string): number[] {
  const closed = new Set(closedSlotIndices(closedCount, dayKey));
  const open: number[] = [];
  for (let i = 0; i < TOTAL_SLOTS; i++) if (!closed.has(i)) open.push(i);
  return open;
}
