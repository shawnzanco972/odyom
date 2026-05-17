"use client";
import { useState } from "react";
import { BrutalButton } from "@/components/BrutalButton";
import { SuggestionDrawer } from "@/components/SuggestionDrawer";

export function SuggestionTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <BrutalButton
        variant="survive"
        onClick={() => setOpen(true)}
        className="text-sm"
      >
        + הצע משפט
      </BrutalButton>
      <SuggestionDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
