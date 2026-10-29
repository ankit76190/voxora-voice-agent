import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Voxora Premium Enterprise Palette
        charcoal: {
          DEFAULT: "#171916",
          50: "#262925",
          100: "#20231F",
          200: "#1D201C",
          300: "#1A1D19",
          400: "#171916", // Main Charcoal
          500: "#131512",
          600: "#0F110E",
          700: "#0B0C0A",
          border: "#2A2E28",
          subtle: "#1F231E",
        },
        ivory: {
          DEFAULT: "#F4F0E7", // Main Warm Ivory
          light: "#FAF8F4",
          dark: "#E8E2D5",
          muted: "#B8B2A5",
        },
        champagne: {
          DEFAULT: "#C7A66A", // Main Champagne Gold
          light: "#D8BC88",
          dark: "#A8884E",
          subtle: "rgba(199, 166, 106, 0.12)",
        },
        sage: {
          DEFAULT: "#DDE4D8", // Main Muted Sage
          light: "#EAF0E6",
          dark: "#B8C4B0",
          subtle: "rgba(221, 228, 216, 0.15)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

