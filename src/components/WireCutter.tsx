"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RiskGauge } from "@/components/UrgencyWidgets";
import { assignSlotPoints } from "@/lib/risk";

export interface WireCutterProps {
  totalSlices: number;
  outcome: "survive" | "death";
  spin: boolean;
  onResolved: (o: "survive" | "death") => void;
  onPlay?: (chosenIndex: number) => void;
  /** Server-assigned green slot values (length = totalSlices-1). */
  slotPoints?: number[];
  /** Value the chosen safe wire should display on survive — matches server baseValue. */
  baseValue?: number;
  /** Awarded points (baseValue + riskBonus) shown floating up over the
   *  cut switch on survive. */
  awardedPoints?: number;
}

type Point = { x: number; y: number };
type CoreState = "idle" | "counting" | "verdict";

function PliersIcon({ size = 44, clamped = false }: { size?: number; clamped?: boolean }) {
  const jawAngle = clamped ? 2 : 14;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ filter: "drop-shadow(3px 3px 0 #0A0A0A)" }}
      aria-hidden
    >
      <g transform={`rotate(${-jawAngle} 32 32)`}>
        <polygon
          points="32,32 14,18 6,22 22,34"
          fill="#1F2937"
          stroke="#0A0A0A"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <rect x="30" y="32" width="26" height="8" rx="1" fill="#9CA3AF" stroke="#0A0A0A" strokeWidth="2.5" />
      </g>
      <g transform={`rotate(${jawAngle} 32 32)`}>
        <polygon
          points="32,32 14,46 6,42 22,30"
          fill="#1F2937"
          stroke="#0A0A0A"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <rect x="30" y="24" width="26" height="8" rx="1" fill="#9CA3AF" stroke="#0A0A0A" strokeWidth="2.5" />
      </g>
      <circle cx="32" cy="32" r="3.5" fill="#0A0A0A" />
    </svg>
  );
}

export function WireCutter({
  totalSlices, outcome, spin, onResolved, onPlay, slotPoints, baseValue, awardedPoints,
}: WireCutterProps) {
  const n = Math.min(32, Math.max(2, totalSlices));
  const safeCount = n - 1;
  // 32 → 8 cols, 16 → 4, 9..16 → 4, 5..8 → 3, 4 → 2, 2 → 2
  const cols = Math.min(8, Math.max(2, Math.ceil(Math.sqrt(n))));

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const bombFlangeRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [switchEnds, setSwitchEnds] = useState<Point[]>([]); // viewBox %, top-center of each button
  const [bombFlange, setBombFlange] = useState<{ left: number; right: number; y: number }>({
    left: 21, right: 79, y: 38,
  });
  const [cutterPx, setCutterPx] = useState<Point>({ x: 0, y: 0 });
  const [cutterOff, setCutterOff] = useState(false);

  const [chosen, setChosen] = useState<number | null>(null);
  const [snap, setSnap] = useState(false);
  const [clamp, setClamp] = useState(false);
  const [coreState, setCoreState] = useState<CoreState>("idle");
  const [fastCounter, setFastCounter] = useState<number>(3);

  const timeouts = useRef<number[]>([]);

  // Pre-pick the bomb wire on commit — exactly one bomb, always.
  const bombIndex = useMemo(() => {
    if (chosen === null) return -1;
    if (outcome === "death") return chosen;
    const others: number[] = [];
    for (let i = 0; i < n; i++) if (i !== chosen) others.push(i);
    if (others.length === 0) return -1;
    return others[Math.floor(Math.random() * others.length)];
  }, [chosen, outcome, n]);

  // Local fallback pool for idle preview before the server returns.
  const previewPoints = useMemo(() => assignSlotPoints(n), [n]);
  const pointsPool = slotPoints ?? previewPoints;

  // Per-switch value map (same shape as CardFlip): skip the bomb, assign pool
  // values 1-to-1 to the safe switches. On survive, force the chosen switch's
  // value to `baseValue` so the on-screen number matches what the modal awards.
  const switchValueByIndex = useMemo(() => {
    const map = new Map<number, number>();
    if (chosen === null) return map;
    let cursor = 0;
    for (let i = 0; i < n; i++) {
      if (i === bombIndex) continue;
      if (i === chosen && outcome === "survive" && typeof baseValue === "number") {
        map.set(i, baseValue);
        cursor++;
        continue;
      }
      const v = pointsPool[cursor++];
      if (typeof v === "number") map.set(i, v);
    }
    return map;
  }, [chosen, bombIndex, n, pointsPool, outcome, baseValue]);

  // 3-2-1-0 countdown — kicks off the moment a wire is cut
  useEffect(() => {
    if (chosen === null) return;
    setCoreState("counting");
    let val = 3;
    setFastCounter(val);
    const id = window.setInterval(() => {
      val -= 1;
      setFastCounter(val);
      if (val <= 0) window.clearInterval(id);
    }, 300);
    return () => window.clearInterval(id);
  }, [chosen]);

  // Bomb-bottom attachment x in viewBox %, evenly spread across flange
  const bombAttach = useCallback(
    (i: number): Point => {
      const pad = 1.2;
      const w = bombFlange.right - bombFlange.left;
      const x = bombFlange.left + pad + ((w - 2 * pad) * (i + 0.5)) / n;
      return { x, y: bombFlange.y };
    },
    [bombFlange, n],
  );

  const measure = useCallback(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const sRect = arena.getBoundingClientRect();
    const flange = bombFlangeRef.current?.getBoundingClientRect();
    if (flange) {
      setBombFlange({
        left: ((flange.left - sRect.left) / sRect.width) * 100,
        right: ((flange.right - sRect.left) / sRect.width) * 100,
        y: ((flange.bottom - sRect.top) / sRect.height) * 100,
      });
    }
    const ends: Point[] = btnRefs.current.slice(0, n).map((el) => {
      if (!el) return { x: 50, y: 80 };
      const r = el.getBoundingClientRect();
      return {
        x: ((r.left + r.width / 2 - sRect.left) / sRect.width) * 100,
        y: ((r.top - sRect.top) / sRect.height) * 100,
      };
    });
    setSwitchEnds(ends);

    if (chosen === null && flange) {
      setCutterPx({
        x: flange.right - sRect.left + 24,
        y: flange.top - sRect.top - 8,
      });
    }
  }, [n, chosen]);

  useLayoutEffect(() => {
    measure();
  }, [measure, totalSlices]);

  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(arena);
    return () => ro.disconnect();
  }, [measure]);

  // Cubic Bezier path string with vertical droop control points
  const wirePath = useCallback(
    (i: number): string => {
      const a = bombAttach(i);
      const b = switchEnds[i];
      if (!b) return "";
      const drop = Math.max(4, (b.y - a.y) * 0.5);
      return `M ${a.x},${a.y} C ${a.x},${a.y + drop} ${b.x},${b.y - drop} ${b.x},${b.y}`;
    },
    [bombAttach, switchEnds],
  );

  // Pliers target: midpoint of wire i in pixel coords
  const wireMidPx = useCallback(
    (i: number): Point => {
      const arena = arenaRef.current;
      const b = switchEnds[i];
      if (!arena || !b) return cutterPx;
      const a = bombAttach(i);
      const sRect = arena.getBoundingClientRect();
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      return { x: (mx / 100) * sRect.width, y: (my / 100) * sRect.height };
    },
    [bombAttach, switchEnds, cutterPx],
  );

  const handleClick = (i: number) => {
    if (chosen !== null || spin) return;
    setChosen(i);
    onPlay?.(i);
    setCutterPx(wireMidPx(i));
  };

  // Resolution: countdown → clamp → snap → verdict → onResolved
  useEffect(() => {
    if (!spin || chosen === null) return;
    const countdownLeft = Math.max(0, fastCounter * 300);
    const clampAt = countdownLeft + 80;
    const snapAt = clampAt + 230;
    const verdictAt = snapAt + 500;
    const resolveAt = verdictAt + 1500;

    const t1 = window.setTimeout(() => setClamp(true), clampAt);
    const t2 = window.setTimeout(() => setSnap(true), snapAt);
    const t3 = window.setTimeout(() => setClamp(false), snapAt + 150);
    const t4 = window.setTimeout(() => {
      setCoreState("verdict");
      setCutterOff(true);
    }, verdictAt);
    const t5 = window.setTimeout(() => onResolved(outcome), resolveAt);
    timeouts.current.push(t1, t2, t3, t4, t5);
    return () => {
      timeouts.current.forEach((id) => window.clearTimeout(id));
      timeouts.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin, chosen, outcome, onResolved]);

  const clockText = (() => {
    if (coreState === "counting") {
      const v = Math.max(0, fastCounter);
      return `00:0${v}`;
    }
    return "00:03";
  })();

  const coreContent = (() => {
    if (coreState === "verdict") {
      if (outcome === "survive") {
        return (
          <span className="font-black text-2xl md:text-4xl tracking-wider" style={{ color: "#338822" }}>
            שרדת! ✅
          </span>
        );
      }
      return (
        <span
          className="font-black text-2xl md:text-4xl tracking-wider animate-pulse"
          style={{ color: "#DC2626" }}
        >
          בום! 💥
        </span>
      );
    }
    return (
      <span className="font-mono font-black text-3xl md:text-5xl tracking-widest text-ink">
        {clockText}
      </span>
    );
  })();

  // Render a single wire (cut → two halves with retracting dash offset)
  const renderWire = (i: number) => {
    const d = wirePath(i);
    if (!d) return null;
    const isBomb = i === bombIndex;
    const showBombIdentity = isBomb && coreState === "verdict";
    const color = showBombIdentity
      ? "#DC2626"
      : i % 2 === 0
        ? "#338822"
        : "#5E8052";
    const isCut = chosen === i && snap;

    if (!isCut) {
      return (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    // Two halves split at param t=0.5, each retracts via stroke-dashoffset.
    // We approximate by drawing the same full path twice with dasharray
    // pathLength=100 — first half visible [0..50] retracts to [0..30],
    // second half [50..100] retracts to [70..100].
    return (
      <g key={i}>
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pathLength={100}
          style={{
            strokeDasharray: "30 100",
            strokeDashoffset: 0,
            transition: "stroke-dasharray 280ms ease-out",
          }}
        />
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pathLength={100}
          style={{
            strokeDasharray: "30 100",
            strokeDashoffset: -70,
            transition: "stroke-dasharray 280ms ease-out",
          }}
        />
      </g>
    );
  };

  const cutterTarget = cutterOff
    ? { x: (arenaRef.current?.getBoundingClientRect().width ?? 0) + 80, y: -80 }
    : cutterPx;

  return (
    <div className="w-full font-rubik flex flex-col gap-3" dir="rtl">
      {/* TOP — risk context */}
      <div className="w-full">
        <RiskGauge ballsDropped={totalSlices} orientation="horizontal" />
      </div>

      {/* Status badge */}
      <div className="self-center bg-white border-[3px] border-[#0A0A0A] shadow-[4px_4px_0_0_#0A0A0A] px-3 py-2 font-black text-xs md:text-sm tabular-nums text-ink text-center">
        על השולחן: 🟢 {safeCount} חוטים בטוחים | 🔴 חוט ממולכד אחד
      </div>

      {/* ARENA */}
      <div
        ref={arenaRef}
        className="relative w-full bg-white border-[3px] border-[#0A0A0A] shadow-[6px_6px_0_0_#0A0A0A] p-3"
        style={{ aspectRatio: "4 / 5" }}
      >
        {/* TOP ROW — bomb */}
        <div className="w-full flex justify-center" style={{ height: "38%" }}>
          <div className="relative h-full" style={{ width: "62%" }}>
            <div className="relative z-10 w-full h-full bg-[#0A0A0A] border-[3px] border-[#0A0A0A] p-1.5 shadow-[4px_4px_0_0_#0A0A0A]">
              <div className="w-full h-full bg-[#E8E2D4] border-[3px] border-[#0A0A0A] flex items-center justify-center text-center px-2">
                {coreContent}
              </div>
            </div>
            {/* hardware flange — wires plug into this strip */}
            <div
              ref={bombFlangeRef}
              className="relative z-10 w-full bg-[#1F2937] border-[3px] border-t-0 border-[#0A0A0A]"
              style={{ height: 14 }}
            />
          </div>
        </div>

        {/* MIDDLE — wire field (just spacer; SVG overlay draws the wires) */}
        <div style={{ height: "20%" }} />

        {/* BOTTOM — switch bank */}
        <div className="w-full" style={{ height: "42%" }}>
          <div className="w-full h-full bg-white border-[3px] border-[#0A0A0A] shadow-[3px_3px_0_0_#0A0A0A] p-2 md:p-3">
            <div
              className="w-full h-full grid place-items-center"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gap: "6px",
              }}
            >
              {Array.from({ length: n }, (_, i) => {
                const disabled = chosen !== null;
                const isChosen = chosen === i;
                const reveal = coreState === "verdict";
                const isBombWire = i === bombIndex;
                const value = switchValueByIndex.get(i);

                // Idle/armed: show 1..N label. Verdict: show pool value or 💀.
                let label: string | number = i + 1;
                if (reveal) {
                  label = isBombWire ? "💀" : typeof value === "number" ? value : i + 1;
                }

                // Bomb wire is highlighted red on verdict to expose what would
                // have killed the player.
                const revealColor = reveal && isBombWire ? "#DC2626" : undefined;
                const revealBorder = reveal && isBombWire ? "4px solid #DC2626" : undefined;
                const revealText = reveal && isBombWire ? "#fff" : undefined;
                const revealBg = reveal && isBombWire ? "#DC2626" : undefined;
                // Survive: highlight the chosen safe wire with a forest-green ring.
                const isSurvivePick = reveal && isChosen && !isBombWire;

                return (
                  <button
                    key={i}
                    ref={(el) => {
                      btnRefs.current[i] = el;
                    }}
                    onClick={() => handleClick(i)}
                    disabled={disabled}
                    aria-label={`חוט ${i + 1}`}
                    className={[
                      "rounded-full aspect-square",
                      "border-[3px] border-[#0A0A0A] font-black bg-white text-ink",
                      "flex items-center justify-center select-none transition-transform",
                      disabled
                        ? isChosen
                          ? "opacity-100 shadow-[0_0_0_0_#0A0A0A]"
                          : reveal
                            ? "opacity-100 shadow-[0_0_0_0_#0A0A0A]"
                            : "opacity-40 cursor-not-allowed shadow-none"
                        : "shadow-[3px_3px_0_0_#0A0A0A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0_0_0_0_#0A0A0A] cursor-pointer",
                    ].join(" ")}
                    style={{
                      width: "clamp(20px, 8vw, 44px)",
                      height: "clamp(20px, 8vw, 44px)",
                      fontSize: "clamp(10px, 2.6vw, 16px)",
                      color: revealText ?? revealColor,
                      backgroundColor: revealBg,
                      border: revealBorder ?? (isSurvivePick ? "4px solid #106B01" : undefined),
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SVG wire overlay — sits BELOW bomb (z-10) so it never crosses the screen */}
        <svg
          className="absolute inset-0 pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {Array.from({ length: n }, (_, i) => renderWire(i))}
        </svg>

        {/* Pliers overlay */}
        <div
          className="absolute pointer-events-none select-none z-20"
          style={{
            left: cutterTarget.x,
            top: cutterTarget.y,
            transform: `translate(-50%, -50%) scale(${clamp ? 1.18 : 1}) rotate(${
              chosen === null ? -15 : 0
            }deg)`,
            transition:
              "left 600ms cubic-bezier(.6,.2,.2,1), top 600ms cubic-bezier(.6,.2,.2,1), transform 180ms ease-out",
          }}
          aria-hidden
        >
          <PliersIcon size={44} clamped={clamp} />
        </div>

        {/* Floating +N over the chosen switch on survive */}
        {coreState === "verdict" &&
          outcome === "survive" &&
          chosen !== null &&
          typeof awardedPoints === "number" &&
          awardedPoints > 0 &&
          switchEnds[chosen] && (
            <span
              className="absolute pointer-events-none font-black text-2xl md:text-3xl text-[#106B01] z-30"
              style={{
                left: `${switchEnds[chosen].x}%`,
                top: `${switchEnds[chosen].y}%`,
                transform: "translate(-50%, -50%)",
                animation: "wire-score-pop 1400ms ease-out forwards",
                textShadow: "2px 2px 0 #ffffff",
              }}
            >
              +{awardedPoints}
            </span>
          )}
        <style jsx>{`
          @keyframes wire-score-pop {
            0%   { transform: translate(-50%, 0%)    scale(0.7); opacity: 0; }
            15%  { transform: translate(-50%, -10%)  scale(1.05); opacity: 1; }
            100% { transform: translate(-50%, -110%) scale(1);    opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
}
