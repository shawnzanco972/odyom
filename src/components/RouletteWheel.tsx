"use client";
import { useEffect, useRef } from "react";

export interface RouletteWheelProps {
  totalSlices: number;
  outcome: "survive" | "death";
  spin: boolean;
  onResolved: (outcome: "survive" | "death") => void;
}

const SPIN_DURATION_MS = 4500;
const FULL_REVS = 5;
const COLOR_RED = "#DC2626";
const COLOR_GREEN_DEEP = "#338822";
const COLOR_GREEN_OLIVE = "#5E8052";
const COLOR_INK = "#0A0A0A";
const COLOR_CONCRETE = "#73796E";
const DIVIDER_WIDTH = 3;
const FRAME_WIDTH = 6;
const TEETH_COUNT = 36;

export function RouletteWheel({ totalSlices, outcome, spin, onResolved }: RouletteWheelProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const spinningRef = useRef(false);

  const draw = (n: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cx = w / 2;
    const cy = h / 2;
    // Shrunk to leave room for gear teeth + pointer.
    const wheelR = Math.min(cx, cy) - 42;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // --- Brutalist offset shadow behind the whole wheel ---
    ctx.save();
    ctx.translate(-6, 6);
    ctx.beginPath();
    ctx.arc(cx, cy, wheelR + 10, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_INK;
    ctx.fill();
    ctx.restore();

    // --- Rotated content (slices + gear teeth) ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRef.current);

    // Slices (with strobe pattern on greens)
    const arc = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
      const start = i * arc;
      const end = start + arc;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, wheelR, start, end);
      ctx.closePath();
      let fill: string;
      if (i === 0) fill = COLOR_RED;
      else fill = i % 2 === 0 ? COLOR_GREEN_DEEP : COLOR_GREEN_OLIVE;
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = DIVIDER_WIDTH;
      ctx.strokeStyle = COLOR_INK;
      ctx.stroke();
    }

    // Gear teeth around the rim (rotate with the wheel)
    const toothOuter = wheelR + 10;
    const toothInner = wheelR;
    const toothHalfW = (Math.PI / 180) * 2.2;
    for (let t = 0; t < TEETH_COUNT; t++) {
      const center = (t / TEETH_COUNT) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(0, 0, toothOuter, center - toothHalfW, center + toothHalfW);
      ctx.arc(0, 0, toothInner, center + toothHalfW, center - toothHalfW, true);
      ctx.closePath();
      ctx.fillStyle = COLOR_INK;
      ctx.fill();
    }

    ctx.restore();

    // --- Outer frame ring (static) ---
    ctx.beginPath();
    ctx.arc(cx, cy, wheelR, 0, Math.PI * 2);
    ctx.lineWidth = FRAME_WIDTH;
    ctx.strokeStyle = COLOR_INK;
    ctx.stroke();

    // --- Center pin (static, with tactile shadow + highlight) ---
    const pinR = wheelR * 0.16;
    // Hard offset shadow
    ctx.save();
    ctx.translate(-4, 4);
    ctx.beginPath();
    ctx.arc(cx, cy, pinR, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_INK;
    ctx.fill();
    ctx.restore();
    // Pin body
    ctx.beginPath();
    ctx.arc(cx, cy, pinR, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_INK;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#FFFFFF";
    ctx.stroke();
    // Highlight dot
    ctx.beginPath();
    ctx.arc(cx - pinR * 0.4, cy - pinR * 0.4, pinR * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    // --- Top pointer (12 o'clock), static ---
    const tipY = cy - wheelR + 6;
    const baseY = cy - wheelR - 22;
    // Black tab behind the triangle (mechanical overlap look)
    ctx.fillStyle = COLOR_INK;
    ctx.fillRect(cx - 26, baseY - 6, 52, 10);
    // Triangle body
    ctx.beginPath();
    ctx.moveTo(cx - 22, baseY);
    ctx.lineTo(cx + 22, baseY);
    ctx.lineTo(cx, tipY);
    ctx.closePath();
    ctx.fillStyle = COLOR_CONCRETE;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeStyle = COLOR_INK;
    ctx.stroke();
  };

  // Resize + initial render
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const size = Math.min(wrapper.clientWidth, 520);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      draw(totalSlices);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Repaint on prop change when idle.
  useEffect(() => {
    if (!spinningRef.current) draw(totalSlices);
  }, [totalSlices, outcome]);

  // Deterministic spin
  useEffect(() => {
    if (!spin || spinningRef.current) return;
    spinningRef.current = true;

    const targetSliceIndex =
      outcome === "death" ? 0 : 1 + Math.floor(Math.random() * Math.max(1, totalSlices - 1));

    // Slice-bounded jitter — lands within 15%–85% across the target slice,
    // guaranteed to stay inside that slice and never spill into a neighbour.
    const arc = (Math.PI * 2) / totalSlices;
    const jitterFraction = 0.15 + Math.random() * 0.7;
    const targetAngleInWheel = (targetSliceIndex + jitterFraction) * arc;

    // Pointer is at 12 o'clock = -π/2. We want
    //   targetAngleInWheel + finalRotation ≡ -π/2  (mod 2π)
    let baseRotation = -Math.PI / 2 - targetAngleInWheel;
    while (baseRotation < 0) baseRotation += Math.PI * 2;

    const startRotation = rotationRef.current;
    let finalRotation = baseRotation + Math.PI * 2 * FULL_REVS;
    while (finalRotation <= startRotation) finalRotation += Math.PI * 2;

    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / SPIN_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      rotationRef.current = startRotation + (finalRotation - startRotation) * eased;
      draw(totalSlices);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rotationRef.current = finalRotation;
        draw(totalSlices);
        spinningRef.current = false;
        rafRef.current = null;
        onResolved(outcome);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      spinningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin]);

  return (
    <div
      ref={wrapperRef}
      className="mx-auto w-full max-w-[520px] flex items-center justify-center"
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
