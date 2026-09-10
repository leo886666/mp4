import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // All semantic colors are CSS variables so the theme can flip at runtime.
        // <alpha-value> keeps opacity modifiers (bg-paper/90) working.
        paper: "rgb(var(--surface) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          mute: "rgb(var(--ink-mute) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
        wash: "rgb(var(--surface2) / <alpha-value>)",
        inv: "rgb(var(--invbg) / <alpha-value>)",
        invhi: "rgb(var(--invhi) / <alpha-value>)",
        invfg: "rgb(var(--invfg) / <alpha-value>)",
        ember: {
          DEFAULT: "rgb(var(--ember) / <alpha-value>)",
          deep: "rgb(var(--ember-deep) / <alpha-value>)",
          tint: "rgb(var(--ember) / 0.07)",
        },
        gold: { DEFAULT: "#B98A2F", tint: "rgb(185 138 47 / 0.12)" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        card: "14px",
        sheet: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,23,28,0.04)",
        lift: "0 10px 30px -12px rgba(23,23,28,0.18)",
        sheet: "0 -12px 40px -12px rgba(23,23,28,0.25)",
      },
      keyframes: {
        "ken-burns": {
          "0%": { transform: "scale(1.06) translateY(0)" },
          "100%": { transform: "scale(1.16) translateY(-1.5%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        "ken-burns": "ken-burns 14s ease-in-out infinite alternate",
        "fade-up": "fade-up .45s ease both",
        "sheet-up": "sheet-up .32s cubic-bezier(.32,.72,.24,1) both",
        shimmer: "shimmer 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
