/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Page ────────────────────────────────────────────────────
        page:    "#1565e8",   // royal blue backdrop
        canvas:  "#1254c8",   // deeper blue for depth
        // ── Cards ───────────────────────────────────────────────────
        card:    "#fffbf0",   // warm cream card
        cardAlt: "#ffffff",   // pure white elevated card
        ink:     "#0a0a1a",   // near-black for borders/text
        // ── Brand neons ─────────────────────────────────────────────
        pink:    "#ff1e78",
        yellow:  "#ffe100",
        lime:    "#00d94e",
        cyan:    "#00d4ff",
        purple:  "#7c3aed",
        orange:  "#ff6b35",
        red:     "#ff3232",
        // ── Status ──────────────────────────────────────────────────
        status: {
          prospect:  "#7c3aed",
          writing:   "#ff6b35",
          review:    "#1565e8",
          submitted: "#00a83a",
          awarded:   "#ffa500",
          declined:  "#888899",
        },
      },
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        body:    ["Inter", "system-ui", "sans-serif"],
      },
      // Pixel-shadow utility (offset hard shadow = retro game UI)
      boxShadow: {
        "px":     "3px 3px 0 #0a0a1a",
        "px-sm":  "2px 2px 0 #0a0a1a",
        "px-lg":  "5px 5px 0 #0a0a1a",
        "px-pink":   "3px 3px 0 #ff1e78",
        "px-yellow": "3px 3px 0 #ffe100",
        "px-lime":   "3px 3px 0 #00d94e",
        "px-cyan":   "3px 3px 0 #00d4ff",
        "px-purple": "3px 3px 0 #7c3aed",
        "card": "4px 4px 0 #0a0a1a",
        "card-hover": "6px 6px 0 #0a0a1a",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      animation: {
        "blink":      "blink 1s step-end infinite",
        "slide-up":   "slideUp 0.2s ease-out",
        "bounce-in":  "bounceIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275)",
        "shimmer":    "shimmer 1.5s linear infinite",
        "float":      "float 3s ease-in-out infinite",
        "glitch":     "glitch 5s ease-in-out infinite",
        "reveal-up":  "revealUp 0.45s cubic-bezier(0.4,0,0.2,1) both",
        "float-px":   "floatPixel 3s ease-in-out infinite",
        "stat-pop":   "statPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both",
        "nav-pop":    "navIconPop 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both",
        "nav-active": "navActivate 0.35s cubic-bezier(0.175,0.885,0.32,1.275) forwards",
        "scan":       "scanMove 3.5s linear infinite",
      },
      keyframes: {
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
        slideUp: {
          "0%":   { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        bounceIn: {
          "0%":   { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)",   opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(-4px)" },
        },
        glitch: {
          "0%,87%,100%": { transform: "translate(0)" },
          "88%": { transform: "translate(-2px, 0)" },
          "89%": { transform: "translate(2px, 0)" },
          "90%": { transform: "translate(-1px, 1px)" },
          "91%": { transform: "translate(1px, -1px)" },
          "92%": { transform: "translate(0)" },
        },
        revealUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        floatPixel: {
          "0%,100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%":      { transform: "translateY(-5px) rotate(2deg)" },
          "66%":      { transform: "translateY(-2px) rotate(-1deg)" },
        },
        statPop: {
          "0%":   { transform: "scale(0.9)", opacity: "0" },
          "60%":  { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        navIconPop: {
          "0%":   { transform: "scale(0.65) rotate(-8deg)", opacity: "0.4" },
          "55%":  { transform: "scale(1.22) rotate(4deg)" },
          "80%":  { transform: "scale(0.96)" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        navActivate: {
          "0%":   { transform: "translateY(0px)" },
          "40%":  { transform: "translateY(-9px)" },
          "65%":  { transform: "translateY(-2px)" },
          "100%": { transform: "translateY(-4px)" },
        },
        scanMove: {
          "0%":   { transform: "translateY(-100%)", opacity: "0.6" },
          "100%": { transform: "translateY(200%)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
