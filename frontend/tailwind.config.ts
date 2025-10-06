// @ts-nocheck
import type { Config } from "tailwindcss";

const config: Config = {
/** @type {import('tailwindcss').Config} */
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "IBM Plex Mono",
          "SFMono-Regular",
          "ui-monospace",
          "monospace",
        ],
        display: ["var(--font-display)", "Playfair Display", "serif"],
      },
      colors: {
        surface: {
          DEFAULT: "rgba(15, 23, 42, 0.75)",
          subtle: "rgba(30, 41, 59, 0.65)",
          deep: "#0f172a",
        },
        accent: {
          DEFAULT: "#6366f1",
          muted: "#4f46e5",
          soft: "#a855f7",
        },
        neutral: {
          100: "#f8fafc",
          200: "#e2e8f0",
          300: "#cbd5f5",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
      boxShadow: {
        floating: "0 20px 45px -25px rgba(99, 102, 241, 0.45)",
        soft: "0 18px 40px -24px rgba(15, 23, 42, 0.32)",
        ring: "0 0 0 1px rgba(148, 163, 184, 0.15)",
      },
      backdropBlur: {
        glass: "24px",
      },
      backgroundImage: {
        "grid-slate":
          "radial-gradient(circle at center, rgba(148, 163, 184, 0.14) 1px, transparent 0)",
        "glow-iris":
          "radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.35), transparent 55%), radial-gradient(circle at 80% 10%, rgba(168, 85, 247, 0.28), transparent 60%)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },
      borderRadius: {
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      transitionTimingFunction: {
        glide: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      animation: {
        shimmer: "shimmer 2.4s linear infinite",
        pulseGlow: "pulseGlow 6s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          from: {
            backgroundPosition: "0 0",
          },
          to: {
            backgroundPosition: "-200% 0",
          },
        },
        pulseGlow: {
          "0%, 100%": {
            opacity: 0.35,
          },
          "50%": {
            opacity: 0.75,
          },
        },
      },
    },
  },
  safelist: ["bg-glow-iris", "backdrop-blur-glass"],
  plugins: [],
};

export default config;
