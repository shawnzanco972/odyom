// IST time math for the roulette slot logic.
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

// Roulette sizing:
//   ballsDropped = max(2, 32 - intervals)  — also the slice count on the wheel
//   openCount    = ballsDropped - 1
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
  const beforeStart = p.h < START_HOUR;
  const day = beforeStart ? p.day : p.day + 1;
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
