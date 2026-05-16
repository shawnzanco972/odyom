\# DESIGN SPECIFICATION: "לשרוד את היום" (Survive the Day)



\## 1. Brand \& Style Identity

This design system embodies the chaotic, cynical, and high-energy spirit of the game "לשרוד את היום". The brand personality is unapologetically Israeli: direct, witty, sharp, and fast-paced.



The visual aesthetic follows a strict \*\*Neo-brutalist / Modern Flat 2.0\*\* hybrid theme:

\- Clean, flat, light-mode backgrounds.

\- High-contrast, vibrant color pops for binary feedback (Survival vs. Death).

\- Heavy use of structural typography and thick, solid black borders.

\- Absolute rejection of soft gradients or blurred ambient shadows in favor of hard graphic depth.



\## 2. Color Palette (Light Mode Minimal)

The palette is optimized for a clean, high-contrast appearance that highlights the high-stakes logic of the daily drop:

\- \*\*Background / Surface:\*\* Pure White (`#FFFFFF`) or Ultra-Light Flat Grey (`#F9FAFB`).

\- \*\*Survival Green:\*\* Vibrant Neon Green (`#22C55E`) used for active success states, survival modals, and primary action buttons.

\- \*\*Death Red:\*\* Intense Crimson Red (`#DC2626`) used exclusively for the single death ball, error indicators, and failure states.

\- \*\*Concrete Gray:\*\* Neutral Matte Gray (`#73796E`) used for pegboard pins, container outlines, and secondary metadata text.



\## 3. Typography \& RTL Layout

\- \*\*Font Family:\*\* \*\*Rubik\*\* (or Heebo/Assistant fallback) to support clean, geometric, bold Hebrew and English scripts seamlessly.

\- \*\*Weight \& Impact:\*\* Typography is treated as a primary visual element. Headlines and status metrics are oversized, ultra-bold, and punchy to deliver the game's cynical copy with maximum weight.

\- \*\*Direction:\*\* Native Right-to-Left (RTL) alignment (`direction: rtl`) across all layouts, with strict attention to correct Hebrew punctuation trailing.



\## 4. Elevation \& Depth (Hard Brutalist Shadows)

\- \*\*Thick Outlines:\*\* Every card, modal, badge, and button must feature a solid 2px or 3px dark border using Concrete Gray (`#73796E`).

\- \*\*Shift Shadows:\*\* Interactive components utilize a flat, solid, unblurred offset shadow (4px down, 4px left for RTL layout).

\- \*\*Tactile Interaction:\*\* On-click or on-tap, elements must visually shift down and left (`transform: translate(-4px, 4px)`) to align perfectly with their shadow layer, simulating a tactile mechanical switch.



\## 5. Screen Layout \& Component Blueprint



\### A. Header Dashboard (Top Bar)

A minimal, clean dashboard fixed at the top of the mobile viewport:

\- \*\*Right Alignment:\*\* Daily streak counter badge ("🔥 רצף: 12 ימים").

\- \*\*Left Alignment:\*\* Total score display ("🏆 2,450 נק׳").

\- \*\*Center Alignment:\*\* A clean digital indicator showing the current game interval clock (e.g., "שעה: 14:30").



\### B. The Main Arena (The Peg Field)

A symmetrical pyramid grid filling the center of the viewport:

\- \*\*The Pins:\*\* Small, identical, perfectly circular dots colored in Concrete Gray, spaced evenly.

\- \*\*The Boundaries:\*\* Clean, straight, angled solid outer walls keeping falling pieces contained.



\### C. The 32 Bottom Slots (The Core Time Logic)

A horizontal grid of exactly 32 separate, rectangular slots spanning the entire bottom of the peg field. This component changes states dynamically throughout the day:

\- \*\*Closed / Past Slots State:\*\* Slots corresponding to the 30-minute intervals that have already elapsed since 08:00 AM IST are rendered as "Closed". Each closed slot is visually occupied by a small, static, low-opacity green sphere resting inside it (representing a safe interval passed).

\- \*\*Active / Open Slots State:\*\* The remaining empty slots on the right are highlighted, empty, and open, waiting to capture the active spheres. One of these open slots is pre-allocated by the system as the "Target Fate Slot".



\### D. The Spheres (Pure Code, No Visual Fluff)

The falling pieces are tiny, perfectly smooth, glossy 3D-shaded spheres with \*\*absolutely no text, numbers, symbols, or icons\*\* rendered on them:

\- \*\*Survival Pieces:\*\* Small Neon Green spheres (`#22C55E`), matching `Active\_Slots - 1`.

\- \*\*The Lethal Piece:\*\* Exactly one (1) Crimson Red sphere (`#DC2626`).



\### E. Cynicism Modals (The Outcome Cards)

Sleek, high-contrast pop-up cards that appear over a clean backdrop immediately after the target slot is filled:

\- \*\*Survival Card:\*\* Crisp white surface, thick Neon Green border, oversized header "\*\*שרדת! 🟢\*\*", followed by a random sarcastic phrase matching the current hour's tier, and a shared streak button.

\- \*\*Death Card:\*\* Crisp white surface, thick Crimson Red border, oversized header "\*\*מתת 🔴\*\*", showing a text breakdown of the cynical reason, a broken streak animation (resets to 0), and an action button linking to the National Leaderboard. The main gameplay button is completely locked until 08:00 AM the next day.

