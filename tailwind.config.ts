import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        rf: {
          bg: "#0a0a0a",
          surface: "#0f0f12",
          accent: "#6366f1",
          muted: "#a1a1aa",
        },
      },
      boxShadow: {
        glass: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px -32px rgba(0,0,0,0.9)",
        glow: "0 0 60px -15px rgba(99, 102, 241, 0.45)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgba(10,10,10,0.2), #0a0a0a), radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.12), transparent)",
      },
    },
  },
  plugins: [],
};
export default config;
