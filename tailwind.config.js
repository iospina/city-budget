/** @type {import('tailwindcss').Config} */
// Design tokens mirror the City Permits set where they overlap.
// systemBlue is #007AFF (NOT the legacy #0062CF). See Implementation Brief Section 8.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Apple-style system palette (locked design system)
        systemRed: "#FF3B30",
        systemOrange: "#FF9500",
        systemYellow: "#FFCC00",
        systemGreen: "#34C759",
        systemMint: "#00C7BE",
        systemTeal: "#30B0C7",
        systemCyan: "#32ADE6",
        systemBlue: "#007AFF",
        systemIndigo: "#5856D6",
        systemPurple: "#AF52DE",
        systemPink: "#FF2D55",
        systemBrown: "#A2845E",
        // Identity bands
        spending: "#FF2D55", // systemPink
        revenue: "#34C759", // systemGreen
        // Neutrals
        track: "#D0D0D0", // part-to-whole bar track
        ink: "#1C1C1E",
        inkMuted: "#8E8E93",
        cardFill: "#FFFFFF",
        pillFill: "#F2F2F7", // inactive measure pill
      },
      fontSize: {
        // Typography scale (Implementation Brief appendix)
        "hero-mobile": ["32px", { lineHeight: "1.1", fontWeight: "700" }],
        "hero-desktop": ["36px", { lineHeight: "1.1", fontWeight: "700" }],
        "detail-headline": ["28px", { lineHeight: "1.15", fontWeight: "700" }],
        "part-rollup": ["24px", { lineHeight: "1.2", fontWeight: "600" }],
        "section-header": ["20px", { lineHeight: "1.25", fontWeight: "700" }],
        "card-title": ["15px", { lineHeight: "1.3", fontWeight: "600" }],
        "row-amount": ["17px", { lineHeight: "1.3", fontWeight: "700" }],
        "pill": ["13px", { lineHeight: "1.2" }],
        "description": ["13px", { lineHeight: "1.4", fontWeight: "400" }],
      },
      borderRadius: {
        card: "16px",
        pill: "10px",
      },
    },
  },
  plugins: [],
};
