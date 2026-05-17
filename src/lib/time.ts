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

// Minutes until the next 30-min boundary (the next slice drop) in IST.
// Capped to 0 once we're past 23:30 (no more drops until next morning's reset).
export function minutesUntilNextDrop(now: Date = new Date()): number {
  const p = istParts(now);
  if (p.h < START_HOUR) {
    return (START_HOUR - p.h) * 60 - p.mi;
  }
  if (p.h >= 23 && p.mi >= 30) return 0;
  const minsInBlock = p.mi % 30;
  return 30 - minsInBlock;
}

// 0..1 — same shape as the verdict route's death-odds curve so client-side
// displays stay consistent with the actual server math.
export function deathOddsFromBalls(ballsDropped: number): number {
  const intervals = TOTAL_SLOTS - ballsDropped;
  return Math.min(0.55, 0.05 + 0.5 * (intervals / 30));
}

export function survivalChanceFromBalls(ballsDropped: number): number {
  return 1 - deathOddsFromBalls(ballsDropped);
}
