"use client";

import { useEffect, useRef, useState } from "react";

export interface WireCutterProps {
  totalSlices: number;
  outcome: "survive" | "death";
  spin: boolean;
  onResolved: (o: "survive" | "death") => void;
  onPlay?: (chosenIndex: number) => void;
}

export function WireCutter({ totalSlices, outcome, spin, onResolved, onPlay }: WireCutterProps) {
  const [cut, setCut] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [snap, setSnap] = useState(false);
  const [flash, setFlash] = useState(false);
  const [sparks, setSparks] = useState(false);
  const timeouts = useRef<number[]>([]);

  const safeCount = Math.max(0, totalSlices - 1);

  const handleClick = (i: number) => {
    if (cut !== null || spin) return;
    setCut(i);
    onPlay?.(i);
  };

  useEffect(() => {
    if (!spin || cut === null) return;
    const t1 = window.setTimeout(() => setSnap(true), 50);
    const t2 = window.setTimeout(() => {
      setFlash(true);
      if (outcome === "death") setSparks(true);
    }, 450);
    const t3 = window.setTimeout(() => {
      setFlash(false);
      setSparks(false);
    }, 1050);
    const t4 = window.setTimeout(() => onResolved(outcome), 1200);
    timeouts.current.push(t1, t2, t3, t4);
    return () => {
      timeouts.current.forEach((id) => window.clearTimeout(id));
      timeouts.current = [];
    };
  }, [spin, cut, outcome, onResolved]);

  const flashBg = outcome === "survive" ? "#C4EAB4" : "#FECACA";

  return (
    <div className="w-full font-rubik" dir="rtl">
      {/* Header — active deck */}
      <div className="text-center text-xs md:text-sm font-black text-ink mb-3 tabular-nums">
        🟢 {safeCount} חוטים בטוחים | 🔴 חוט ממולכד אחד
      </div>

      {/* Bomb device shell */}
      <div
        className="w-full border-[3px] border-[#0A0A0A] shadow-[6px_6px_0_0_#0A0A0A] p-4 transition-colors duration-150"
        style={{
          aspectRatio: "1 / 1",
          backgroundColor: flash ? flashBg : "#1F2937",
        }}
      >
        {/* Inner casing */}
        <div
          className="w-full h-full border-[3px] border-[#0A0A0A] p-3"
          style={{ backgroundColor: flash ? flashBg : "#0F172A" }}
        >
          <div className="w-full h-full flex items-stretch justify-between gap-1.5">
            {Array.from({ length: totalSlices }, (_, i) => {
              const color = i % 2 === 0 ? "#338822" : "#5E8052";
              const isCut = cut === i;
              const broken = isCut && snap;
              const isHover = hover === i && cut === null;
              return (
                <button
                  key={i}
                  onClick={() => handleClick(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  disabled={cut !== null}
                  className="relative flex-1 h-full flex flex-col"
                  aria-label={`חוט ${i + 1}`}
                >
                  {/* top half */}
                  <div
                    className="w-full border-[3px] border-[#0A0A0A]"
                    style={{
                      flex: 1,
                      backgroundColor: color,
                      transform: broken ? "translateY(-12px) rotate(-4deg)" : "none",
                      transition: "transform 350ms ease-out",
                      transformOrigin: "bottom center",
                    }}
                  />
                  {/* gap */}
                  <div style={{ height: broken ? 6 : 0, transition: "height 350ms" }} />
                  {/* bottom half */}
                  <div
                    className="w-full border-[3px] border-[#0A0A0A]"
                    style={{
                      flex: 1,
                      backgroundColor: color,
                      transform: broken ? "translateY(12px) rotate(4deg)" : "none",
                      transition: "transform 350ms ease-out",
                      transformOrigin: "top center",
                    }}
                  />

                  {/* sparks on death */}
                  {broken && sparks && (
                    <>
                      <span
                        className="absolute"
                        style={{
                          left: "50%",
                          top: "48%",
                          width: 7,
                          height: 7,
                          backgroundColor: "#DC2626",
                          border: "1px solid #0A0A0A",
                          transform: "translate(-180%, 0) rotate(20deg)",
                        }}
                      />
                      <span
                        className="absolute"
                        style={{
                          left: "50%",
                          top: "50%",
                          width: 6,
                          height: 6,
                          backgroundColor: "#F59E0B",
                          border: "1px solid #0A0A0A",
                          transform: "translate(80%, -140%) rotate(-30deg)",
                        }}
                      />
                      <span
                        className="absolute"
                        style={{
                          left: "50%",
                          top: "52%",
                          width: 8,
                          height: 8,
                          backgroundColor: "#DC2626",
                          border: "1px solid #0A0A0A",
                          transform: "translate(-30%, 120%) rotate(45deg)",
                        }}
                      />
                    </>
                  )}

                  {/* scissors indicator on hover or chosen-armed */}
                  {(isHover || (isCut && !snap)) && (
                    <span
                      className="absolute inset-x-0 pointer-events-none"
                      style={{
                        top: "50%",
                        transform: "translateY(-50%)",
                        textAlign: "center",
                        fontSize: 26,
                        textShadow: "2px 2px 0 #0A0A0A",
                      }}
                    >
                      ✂️
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
