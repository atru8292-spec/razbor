import type { Config } from "tailwindcss";

// Палитра и типографика — locked, из docs/DESIGN.md.
// Это база для Шага 7 (премиальная выдача). Компоненты тут не описываем.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        oxblood: "#4E0000", // brand primary + severity HIGH
        "oxblood-deep": "#360000", // hover / глубина
        espresso: "#362017", // legacy текст (постепенно → ink)
        ink: "#1A1A1A", // основной текст (brutalism-редизайн)
        "ink-soft": "#4A4038", // вторичный текст
        paper: "#FAF5E7", // фон страницы
        "paper-2": "#F2EAD6", // вложенная поверхность
        line: "#E0D5BD", // линии-разделители
        "dusty-blue": "#A9BBD1", // спокойный акцент / severity OK
        navy: "#263650", // глубина / severity MEDIUM
      },
      fontFamily: {
        // подключаются через next/font в app/layout.tsx
        display: ["var(--font-unbounded)", "system-ui", "sans-serif"],
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
