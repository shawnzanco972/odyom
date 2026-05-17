"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface CardFlipProps {
  totalSlices: number;
  outcome: "survive" | "death";
  spin: boolean;
  onResolved: (o: "survive" | "death") => void;
  onPlay?: (chosenIndex: number) => void;
}

export function CardFlip({ totalSlices, outcome, spin, onResolved, onPlay }: CardFlipProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [revealChosen, setRevealChosen] = useState(false);
  const timeouts = useRef<number[]>([]);

  const surviveCount = Math.max(0, totalSlices - 1);

  // Pre-pick the joker index the moment the user commits to a card. There is
  // ALWAYS exactly one joker — either it's the chosen card (death) or it's a
  // random other card (survive). Memoised on (chosen, outcome) so it doesn't
  // re-roll mid-reveal.
  const jokerIndex = useMemo(() => {
    if (chosen === null) return -1;
    if (outcome === "death") return chosen;
    // survive: random non-chosen index
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
    const stagger = 50;
    const others: number[] = [];
    for (let i = 0; i < totalSlices; i++) if (i !== chosen) others.push(i);
    others.forEach((idx, k) => {
      const t = window.setTimeout(() => {
        setFlipped((prev) => {
          const next = new Set(prev);
          next.add(idx);
          return next;
        });
      }, k * stagger);
      timeouts.current.push(t);
    });
    const flipAllDone = others.length * stagger + 400;
    const tReveal = window.setTimeout(() => setRevealChosen(true), flipAllDone);
    const tDone = window.setTimeout(() => onResolved(outcome), flipAllDone + 800);
    timeouts.current.push(tReveal, tDone);
    return () => {
      timeouts.current.forEach((id) => window.clearTimeout(id));
      timeouts.current = [];
    };
  }, [spin, chosen, totalSlices, outcome, onResolved]);

  return (
    <div className="w-full font-rubik" dir="rtl">
      {/* Live desk counter — centered above the grid */}
      <div className="text-center text-xs md:text-sm font-black text-ink mb-3 tabular-nums">
        על השולחן: 🟢 {surviveCount} אסים | 🔴 ג'וקר אחד
      </div>

      <div className="w-full bg-white border-[3px] border-[#0A0A0A] shadow-[6px_6px_0_0_#0A0A0A] p-4">
        <div className="flex flex-wrap justify-center gap-3">
          {Array.from({ length: totalSlices }, (_, i) => {
            const isChosen = chosen === i;
            const isFlipped = flipped.has(i) || (isChosen && revealChosen);
            // Each card's face is determined by whether IT is the joker, not
            // by the global outcome — guarantees exactly one joker on screen.
            const showsJoker = isFlipped && i === jokerIndex;
            const isHighlight = isChosen && revealChosen;

            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                disabled={chosen !== null}
                className="relative aspect-[2/3] w-16 md:w-20 lg:w-24"
                style={{ perspective: "700px" }}
                aria-label={`קלף ${i + 1}`}
              >
                <div
                  className="relative w-full h-full transition-transform duration-500"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* BACK FACE (idle) — minimalist beige/concrete card back */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      backfaceVisibility: "hidden",
                      backgroundColor: "#E8E2D4",
                      border: "3px solid #0A0A0A",
                      boxShadow: "4px 4px 0 0 #0A0A0A",
                      transform: isChosen && !revealChosen ? "translateY(-4px) scale(1.03)" : undefined,
                      transition: "transform 200ms ease-out",
                    }}
                  >
                    <span className="font-black text-2xl md:text-3xl text-[#0A0A0A]">?</span>
                  </div>

                  {/* FRONT FACE (revealed) */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-between p-1.5"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      backgroundColor: "#FFFFFF",
                      border: isHighlight && showsJoker
                        ? "4px solid #DC2626"
                        : isHighlight
                          ? "4px solid #106B01"
                          : "3px solid #0A0A0A",
                      boxShadow: "4px 4px 0 0 #0A0A0A",
                    }}
                  >
                    {showsJoker ? (
                      <>
                        <span className="self-start font-black text-[10px] md:text-xs text-[#DC2626] leading-none">
                          🔴
                        </span>
                        <span className="font-black text-base md:text-xl text-[#DC2626] leading-none">
                          Joker
                        </span>
                        <span className="self-end font-black text-[10px] md:text-xs text-[#DC2626] leading-none rotate-180">
                          🔴
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="self-start font-black text-[10px] md:text-xs text-[#106B01] leading-none">
                          🟢
                        </span>
                        <span className="font-black text-2xl md:text-3xl text-[#106B01] leading-none">
                          A
                        </span>
                        <span className="self-end font-black text-[10px] md:text-xs text-[#106B01] leading-none rotate-180">
                          🟢
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
