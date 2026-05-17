"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { RiskGauge } from "@/components/UrgencyWidgets";

export interface WireCutterProps {
  totalSlices: number;
  outcome: "survive" | "death";
  spin: boolean;
  onResolved: (o: "survive" | "death") => void;
  onPlay?: (chosenIndex: number) => void;
}

type Panel = "T" | "R" | "B" | "L";
type Node = { panel: Panel; indexInPanel: number; panelCount: number; globalIndex: number; label: number };
type Point = { x: number; y: number };
type Rect = { left: number; right: number; top: number; bottom: number };
type CoreState = "idle" | "counting" | "verdict";

function buildNodes(total: number): Node[] {
  const n = Math.min(32, Math.max(2, total));
  const panels: Panel[] = ["T", "R", "B", "L"];
  const counters: Record<Panel, number> = { T: 0, R: 0, B: 0, L: 0 };
  for (let i = 0; i < n; i++) counters[panels[i % 4]]++;
  const seen: Record<Panel, number> = { T: 0, R: 0, B: 0, L: 0 };
  const out: Node[] = [];
  for (let i = 0; i < n; i++) {
    const p = panels[i % 4];
    out.push({
      panel: p,
      indexInPanel: seen[p]++,
      panelCount: counters[p],
      globalIndex: i,
      label: i + 1,
    });
  }
  return out;
}

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

export function WireCutter({ totalSlices, outcome, spin, onResolved, onPlay }: WireCutterProps) {
  const nodes = buildNodes(totalSlices);
  const safeCount = Math.max(0, Math.min(32, totalSlices) - 1);

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const coreRef = useRef<HTMLDivElement | null>(null);
  const topPanelRef = useRef<HTMLDivElement | null>(null);
  const bottomPanelRef = useRef<HTMLDivElement | null>(null);
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [wireEnds, setWireEnds] = useState<Point[]>([]);
  const [coreRect, setCoreRect] = useState<Rect>({ left: 40, right: 60, top: 40, bottom: 60 });
  const [panelRects, setPanelRects] = useState<{ T: Rect; B: Rect; L: Rect; R: Rect }>({
    T: { left: 0, right: 100, top: 0, bottom: 30 },
    B: { left: 0, right: 100, top: 70, bottom: 100 },
    L: { left: 0, right: 30, top: 30, bottom: 70 },
    R: { left: 70, right: 100, top: 30, bottom: 70 },
  });
  const [cutterPx, setCutterPx] = useState<Point>({ x: 0, y: 0 });
  const [cutterOff, setCutterOff] = useState(false);

  const [chosen, setChosen] = useState<number | null>(null);
  const [snap, setSnap] = useState(false);
  const [clamp, setClamp] = useState(false);
  const [coreState, setCoreState] = useState<CoreState>("idle");
  const [fastCounter, setFastCounter] = useState<number>(3);

  const timeouts = useRef<number[]>([]);

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

  const measure = useCallback(() => {
    const arena = arenaRef.current;
    const core = coreRef.current;
    if (!arena || !core) return;
    const sRect = arena.getBoundingClientRect();
    const toPct = (r: DOMRect): Rect => ({
      left: ((r.left - sRect.left) / sRect.width) * 100,
      right: ((r.right - sRect.left) / sRect.width) * 100,
      top: ((r.top - sRect.top) / sRect.height) * 100,
      bottom: ((r.bottom - sRect.top) / sRect.height) * 100,
    });
    const cRect = core.getBoundingClientRect();
    const coreR = toPct(cRect);
    setCoreRect(coreR);

    const T = topPanelRef.current?.getBoundingClientRect();
    const B = bottomPanelRef.current?.getBoundingClientRect();
    const L = leftPanelRef.current?.getBoundingClientRect();
    const R = rightPanelRef.current?.getBoundingClientRect();
    if (T && B && L && R) {
      setPanelRects({ T: toPct(T), B: toPct(B), L: toPct(L), R: toPct(R) });
    }

    const ends: Point[] = btnRefs.current.slice(0, nodes.length).map((el) => {
      if (!el) return { x: 50, y: 50 };
      const r = el.getBoundingClientRect();
      return {
        x: ((r.left + r.width / 2 - sRect.left) / sRect.width) * 100,
        y: ((r.top + r.height / 2 - sRect.top) / sRect.height) * 100,
      };
    });
    setWireEnds(ends);

    if (chosen === null) {
      const coreCenterPx = {
        x: cRect.left + cRect.width / 2 - sRect.left,
        y: cRect.top + cRect.height / 2 - sRect.top,
      };
      setCutterPx({
        x: coreCenterPx.x + cRect.width * 0.5,
        y: coreCenterPx.y - cRect.height * 0.55,
      });
    }
  }, [nodes.length, chosen]);

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

  // Compute polyline points (in viewBox %) for each node so wires never cross the bomb
  const computePath = useCallback(
    (n: Node): Point[] => {
      const end = wireEnds[n.globalIndex];
      if (!end) return [];
      const pad = 1.2;
      const insetX = coreRect.left + pad + ((coreRect.right - coreRect.left - 2 * pad) * (n.indexInPanel + 0.5)) / n.panelCount;
      const insetY = coreRect.top + pad + ((coreRect.bottom - coreRect.top - 2 * pad) * (n.indexInPanel + 0.5)) / n.panelCount;

      if (n.panel === "T") {
        const corridorY = (panelRects.T.bottom + coreRect.top) / 2;
        return [
          { x: end.x, y: end.y },
          { x: end.x, y: corridorY },
          { x: insetX, y: corridorY },
          { x: insetX, y: coreRect.top },
        ];
      }
      if (n.panel === "B") {
        const corridorY = (coreRect.bottom + panelRects.B.top) / 2;
        return [
          { x: end.x, y: end.y },
          { x: end.x, y: corridorY },
          { x: insetX, y: corridorY },
          { x: insetX, y: coreRect.bottom },
        ];
      }
      if (n.panel === "L") {
        // route vertically alongside bomb's left, attach to top edge
        const corridorX = (panelRects.L.right + coreRect.left) / 2;
        const corridorY = (panelRects.T.bottom + coreRect.top) / 2;
        return [
          { x: end.x, y: end.y },
          { x: corridorX, y: end.y },
          { x: corridorX, y: corridorY },
          { x: insetX, y: corridorY },
          { x: insetX, y: coreRect.top },
        ];
      }
      // R
      const corridorX = (coreRect.right + panelRects.R.left) / 2;
      const corridorY = (panelRects.T.bottom + coreRect.top) / 2;
      return [
        { x: end.x, y: end.y },
        { x: corridorX, y: end.y },
        { x: corridorX, y: corridorY },
        { x: insetX, y: corridorY },
        { x: insetX, y: coreRect.top },
      ];
    },
    [wireEnds, coreRect, panelRects],
  );

  // Convert a path's last segment midpoint to pixel coords (for pliers target)
  const lastSegMidPx = useCallback(
    (path: Point[]): Point => {
      const arena = arenaRef.current;
      if (!arena || path.length < 2) return cutterPx;
      const sRect = arena.getBoundingClientRect();
      const a = path[path.length - 2];
      const b = path[path.length - 1];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      return { x: (mx / 100) * sRect.width, y: (my / 100) * sRect.height };
    },
    [cutterPx],
  );

  const handleClick = (globalIdx: number) => {
    if (chosen !== null || spin) return;
    setChosen(globalIdx);
    onPlay?.(globalIdx);
    const node = nodes.find((n) => n.globalIndex === globalIdx);
    if (node) {
      const path = computePath(node);
      setCutterPx(lastSegMidPx(path));
    }
  };

  // Resolution sequence: countdown finishes → clamp → snap → hold → verdict shown → hold → onResolved
  useEffect(() => {
    if (!spin || chosen === null) return;
    // wait for the 3→0 countdown to finish before clamping
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
    // intentionally omit fastCounter from deps so we don't reset the chain mid-flight
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
      <span className="font-mono font-black text-2xl md:text-4xl tracking-widest text-ink">
        {clockText}
      </span>
    );
  })();

  const renderPanelButtons = (panel: Panel) => {
    const panelNodes = nodes.filter((n) => n.panel === panel);
    const isSide = panel === "L" || panel === "R";
    const layout = isSide
      ? "flex flex-col flex-wrap items-center justify-center gap-1.5 p-2"
      : "flex flex-row flex-wrap items-center justify-center gap-1.5 p-2";
    return (
      <div className={`w-full h-full ${layout}`}>

        {panelNodes.map((n) => {
          const disabled = chosen !== null;
          const isChosen = chosen === n.globalIndex;
          return (
            <button
              key={n.globalIndex}
              ref={(el) => {
                btnRefs.current[n.globalIndex] = el;
              }}
              onClick={() => handleClick(n.globalIndex)}
              disabled={disabled}
              aria-label={`חוט ${n.label}`}
              className={[
                "rounded-full aspect-square w-9 h-9 md:w-11 md:h-11",
                "border-[3px] border-[#0A0A0A] font-black text-sm md:text-base bg-white text-ink",
                "flex items-center justify-center select-none transition-transform",
                disabled
                  ? isChosen
                    ? "opacity-100 shadow-[0_0_0_0_#0A0A0A]"
                    : "opacity-40 cursor-not-allowed shadow-none"
                  : "shadow-[3px_3px_0_0_#0A0A0A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0_0_0_0_#0A0A0A] cursor-pointer",
              ].join(" ")}
            >
              {n.label}
            </button>
          );
        })}
      </div>
    );
  };

  // Render a polyline (with potential cut)
  const renderWire = (n: Node) => {
    const path = computePath(n);
    if (path.length < 2) return null;
    const color = n.globalIndex % 2 === 0 ? "#338822" : "#5E8052";
    const isCut = chosen === n.globalIndex && snap;
    const toStr = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

    if (!isCut) {
      return (
        <polyline
          key={n.globalIndex}
          points={toStr(path)}
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    // cut at midpoint of last segment
    const a = path[path.length - 2];
    const b = path[path.length - 1];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(0.0001, Math.sqrt(dx * dx + dy * dy));
    const ux = dx / len;
    const uy = dy / len;
    const retract = 2.5;
    const half1 = [...path.slice(0, -1), { x: mx - ux * retract, y: my - uy * retract }];
    const half2: Point[] = [
      { x: mx + ux * retract, y: my + uy * retract },
      b,
    ];
    return (
      <g key={n.globalIndex} style={{ transition: "all 250ms ease-out" }}>
        <polyline
          points={toStr(half1)}
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={toStr(half2)}
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
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
        className="relative w-full bg-white border-[3px] border-[#0A0A0A] shadow-[6px_6px_0_0_#0A0A0A]"
        style={{ aspectRatio: "1 / 1" }}
      >
        <div
          className="w-full h-full p-3 grid gap-3"
          style={{
            gridTemplateColumns: "1fr 1.2fr 1fr",
            gridTemplateRows: "1fr 1.2fr 1fr",
          }}
        >
          <div
            ref={topPanelRef}
            className="col-span-3 border-[3px] border-[#0A0A0A] shadow-[3px_3px_0_0_#0A0A0A] bg-white"
          >
            {renderPanelButtons("T")}
          </div>
          <div
            ref={leftPanelRef}
            className="border-[3px] border-[#0A0A0A] shadow-[3px_3px_0_0_#0A0A0A] bg-white"
          >
            {renderPanelButtons("L")}
          </div>
          {/* Core: opaque bezel so wires never overlap the screen */}
          <div
            ref={coreRef}
            className="relative z-10 border-[3px] border-[#0A0A0A] shadow-[3px_3px_0_0_#0A0A0A] bg-[#0A0A0A] p-1.5"
          >
            <div className="w-full h-full bg-[#E8E2D4] border-[3px] border-[#0A0A0A] flex items-center justify-center text-center px-2">
              {coreContent}
            </div>
          </div>
          <div
            ref={rightPanelRef}
            className="border-[3px] border-[#0A0A0A] shadow-[3px_3px_0_0_#0A0A0A] bg-white"
          >
            {renderPanelButtons("R")}
          </div>
          <div
            ref={bottomPanelRef}
            className="col-span-3 border-[3px] border-[#0A0A0A] shadow-[3px_3px_0_0_#0A0A0A] bg-white"
          >
            {renderPanelButtons("B")}
          </div>
        </div>

        {/* SVG wire overlay — sits BELOW the core (which has z-10) so wires don't cross the timer */}
        <svg
          className="absolute inset-0 pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {nodes.map((n) => renderWire(n))}
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
      </div>
    </div>
  );
}
