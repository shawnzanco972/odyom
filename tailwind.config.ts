import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        gray: { concrete: "#73796E" },
        survive: "#22C55E",
        "survive-deep": "#106B01",         // CTA + accent on survival screens
        "survive-bg": "#C4EAB4",           // full-bleed mint background
        death: "#DC2626",
        "death-bg": "#FECACA",             // full-bleed soft pink
        bgsoft: "#F9FAFB",
        "leaderboard-bg": "#F1FDE7",       // leaderboard mint
        "rank-gold": "#FFDB40",            // top-3 cards
        "tag-pink": "#BB0022",             // brutalist madness tag (top rank)
      },
      fontFamily: { rubik: ["var(--font-rubik)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
