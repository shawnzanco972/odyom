"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface CupsGameProps {
  totalSlices: number;
  outcome: "survive" | "death";
  spin: boolean;
  onResolved: (o: "survive" | "death") => void;
  onPlay?: (chosenIndex: number) => void;
  /** Slot value shown inside the chosen cup's ball on survive. */
  baseValue?: number;
  /** Risk-bonus-inclusive amount shown floating up over the chosen cup. */
  awardedPoints?: number;
}

type Stage = "idle" | "shake" | "lift";

export function CupsGame({
  totalSlices, outcome, spin, onResolved, onPlay, baseValue, awardedPoints,
}: CupsGameProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const timeouts = useRef<number[]>([]);

  const cols = useMemo(() => {
    const c = Math.ceil(Math.sqrt(Math.max(2, totalSlices)));
    return Math.min(6, Math.max(2, c));
  }, [totalSlices]);

  // Pre-pick the skull cup the moment the user commits. Always exactly one:
  //   death  → trap = chosen
  //   survive → trap = random non-chosen cup
  const trapIndex = useMemo(() => {
    if (chosen === null) return -1;
    if (outcome === "death") return chosen;
    const others: number[] = [];
    for (let i = 0; i < totalSlices; i++) if (i !== chosen) others.push(i);
    if (others.length === 0) return -1;
    return others[Math.floor(Math.random() * others.length)];
  }, [chosen, outcome, totalSlices]);

  const handleClick = (i: number) => {
    if (chosen !== null || spin) return;
    setChosen(i);
    onPlay?.(i);
  };

  useEffect(() => {
    if (!spin || chosen === null) return;
    setStage("shake");
    const t1 = window.setTimeout(() => setStage("lift"), 1500);
    const t2 = window.setTimeout(() => onResolved(outcome), 2200);
    timeouts.current.push(t1, t2);
    return () => {
      timeouts.current.forEach((id) => window.clearTimeout(id));
      timeouts.current = [];
    };
  }, [spin, chosen, outcome, onResolved]);

  return (
    <>
      <style jsx>{`
        @keyframes cup-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-1deg); }
          75% { transform: translateX(2px) rotate(1deg); }
        }
        @keyframes score-pop {
          0%   { transform: translate(-50%, 0)    scale(0.7); opacity: 0; }
          15%  { transform: translate(-50%, -10px) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%, -60px) scale(1);    opacity: 0; }
        }
      `}</style>
      <div
        className="w-full bg-white border-[3px] border-[#0A0A0A] shadow-[6px_6px_0_0_#0A0A0A] p-3"
        style={{ aspectRatio: "1 / 1" }}
      >
        <div
          className="grid w-full h-full gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: totalSlices }, (_, i) => {
            const isChosen = chosen === i;
            const isTrap = i === trapIndex;
            const lifted = stage === "lift";
            // Reveal: at lift time, all cups raise to show their truth.
            // The trap cup shows the skull; every other cup shows a safe ball.
            const reveal = lifted;
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                disabled={chosen !== null}
                className="relative w-full h-full flex items-end justify-center"
                aria-label={`כוס ${i + 1}`}
              >
                {/* floor */}
                <div className="absolute inset-x-1 bottom-1 h-2 bg-[#0A0A0A]" />
                {reveal && (
                  <div
                    className="absolute"
                    style={{
                      bottom: "10%",
                      width: "55%",
                      aspectRatio: "1 / 1",
                      borderRadius: "9999px",
                      border: "3px solid #0A0A0A",
                      backgroundColor: isTrap ? "#DC2626" : "#338822",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      color: "#fff",
                      fontSize: "1.4rem",
                    }}
                  >
                    {isTrap
                      ? "💀"
                      : isChosen && typeof baseValue === "number"
                        ? baseValue
                        : ""}
                  </div>
                )}
                {/* Floating +N over the chosen cup on survive reveal */}
                {reveal && isChosen && !isTrap && typeof awardedPoints === "number" && awardedPoints > 0 && (
                  <span
                    className="absolute pointer-events-none font-black text-xl md:text-2xl text-[#106B01]"
                    style={{
                      bottom: "70%",
                      left: "50%",
                      animation: "score-pop 1100ms ease-out forwards",
                      textShadow: "2px 2px 0 #ffffff",
                    }}
                  >
                    +{awardedPoints}
                  </span>
                )}
                {/* cup */}
                <div
                  className="absolute"
                  style={{
                    left: "8%",
                    right: "8%",
                    top: "8%",
                    bottom: "12%",
                    backgroundColor: "#9CA3AF",
                    border: "3px solid #0A0A0A",
                    clipPath: "polygon(10% 0, 90% 0, 100% 100%, 0 100%)",
                    transform: lifted ? "translateY(-45%)" : "translateY(0)",
                    transition: "transform 600ms ease-out",
                    animation:
                      stage === "shake" ? "cup-shake 0.15s ease-in-out infinite" : undefined,
                    boxShadow: isChosen && stage === "idle" ? "inset 0 0 0 3px #0A0A0A" : undefined,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
