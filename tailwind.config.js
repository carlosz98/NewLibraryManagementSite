/** Library of Tomorrow design tokens
 *  Gloomy maximalism: deep charcoal ground, bone text, muted jewel blocks.
 *  Type (from the UI/UX Pro Max "condensed for impact headlines" pairing):
 *  Barlow Condensed for display, Barlow for text, JetBrains Mono for labels and SQL.
 *  @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0e0e11",      // page
        coal: "#121216",     // deepest panels
        slate: "#1a1b20",    // surfaces
        slate2: "#23252c",   // raised surfaces
        bone: "#e6dfd2",     // text
        paper: "#cfc7b8",    // light accents on dark
        ash: "#9a958c",      // muted text
        ochre: "#a07c3a",
        gold: "#c9a865",
        teal: "#2f5552",
        oxblood: "#5a1e28",
        wine: "#8a3442",
        moss: "#46523a",
        plum: "#3f2f48",
        rust: "#7a4128",

        // shadcn / 21st.dev tokens (values live in src/index.css, mapped to the palette above)
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: { DEFAULT: "rgb(var(--card) / <alpha-value>)", foreground: "rgb(var(--card-foreground) / <alpha-value>)" },
        primary: { DEFAULT: "rgb(var(--primary) / <alpha-value>)", foreground: "rgb(var(--primary-foreground) / <alpha-value>)" },
        secondary: { DEFAULT: "rgb(var(--secondary) / <alpha-value>)", foreground: "rgb(var(--secondary-foreground) / <alpha-value>)" },
        muted: { DEFAULT: "rgb(var(--muted) / <alpha-value>)", foreground: "rgb(var(--muted-foreground) / <alpha-value>)" },
        accent: { DEFAULT: "rgb(var(--accent) / <alpha-value>)", foreground: "rgb(var(--accent-foreground) / <alpha-value>)" },
        "accent-strong": "rgb(var(--accent-strong) / <alpha-value>)",
        destructive: { DEFAULT: "rgb(var(--destructive) / <alpha-value>)", foreground: "rgb(var(--destructive-foreground) / <alpha-value>)" },
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1px)",
        sm: "calc(var(--radius) - 2px)",
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Arial Narrow"', "sans-serif"],
        sans: ["Barlow", '"Helvetica Neue"', "Arial", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "Menlo", "Consolas", "monospace"],
        sign: ['"Mrs Saint Delafield"', '"Brush Script MT"', "cursive"],
      },
      borderColor: {
        DEFAULT: "rgba(230, 223, 210, 0.12)",
      },
      keyframes: {
        marquee: { to: { transform: "translateX(-50%)" } },
        spin33: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        marquee: "marquee 60s linear infinite",
        spin33: "spin33 1.8s linear infinite", // 33 1/3 rpm
      },
    },
  },
  plugins: [],
};
