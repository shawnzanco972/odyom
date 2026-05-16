"use client";
import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "survive" | "death" | "ink";

export function BrutalButton({
  variant = "ink",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const palette = {
    survive: "bg-survive text-white border-ink",
    death: "bg-death text-white border-ink",
    ink: "bg-white text-ink border-ink",
  }[variant];
  return (
    <button
      {...rest}
      className={clsx(
        "select-none font-rubik font-black tracking-tight uppercase",
        "px-6 py-3 border-[3px] text-lg",
        "shadow-[-4px_4px_0_0_#0A0A0A]",
        "transition-transform duration-75",
        "active:translate-x-[-4px] active:translate-y-[4px] active:shadow-none",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[-4px_4px_0_0_#0A0A0A]",
        palette,
        className,
      )}
    />
  );
}
