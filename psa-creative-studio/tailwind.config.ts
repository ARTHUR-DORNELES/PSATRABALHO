import type { Config } from "tailwindcss";

// Mesmo tema "Tech" dos outros dashboards PSA (psa-growth-dashboard),
// pra manter consistência visual entre as ferramentas internas.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        psa: {
          bg: "#0A0F17",
          surface: "#0E1623",
          card: "#111C2B",
          cardHover: "#16233A",
          border: "#1F2D42",

          accent: "#00C86F",
          accentHover: "#00B362",
          brand: "#2E8BFF",
          brandHover: "#1E7AEC",
          teal: "#2DD4BF",
          pink: "#F472B6",
          yellow: "#F5E62D",
          ice: "#E8EEF6",

          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#F43F5E",
          muted: "#8296B0",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        display: ["var(--font-display)", "Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "psa-card": "0 8px 30px -12px rgba(0, 0, 0, 0.55)",
        "psa-glow":
          "0 0 0 1px rgba(0, 200, 111, 0.35), 0 6px 24px -6px rgba(0, 200, 111, 0.30)",
      },
      backgroundImage: {
        "psa-grad": "linear-gradient(135deg, #00C86F 0%, #2E8BFF 100%)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
