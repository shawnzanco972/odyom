import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        gray: { concrete: "#73796E" },
        survive: "#22C55E",
        death: "#DC2626",
        bgsoft: "#F9FAFB",
      },
      fontFamily: { rubik: ["var(--font-rubik)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
